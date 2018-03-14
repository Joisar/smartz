#!/usr/bin/env python3
import base64
import re
import sys
import os
import json
import tempfile
from shutil import copy2
from urllib.parse import urlparse

from pymongo import MongoClient
from bson.objectid import ObjectId
from jsonschema.validators import validator_for

from flask import Flask, abort, request

ROOT_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
if not os.path.isdir(DATA_DIR):
    raise RuntimeError('DATA_DIR is not found at {}'.format(DATA_DIR))

sys.path.append(os.path.join(ROOT_DIR, 'pythonlib'))
sys.path.append(os.path.join(ROOT_DIR, 'constructor_engine'))

from smartz.json_schema import load_schema, add_definitions, assert_conforms2schema_part
from engine import SimpleStorageEngine


app = Flask(__name__)

mongoc = MongoClient(host=os.environ.get('SMARTZ_MONGO_HOST', 'mongo'), connect=False)
db = mongoc.sc_ctors_db

ctor_engine = SimpleStorageEngine({'datadir': DATA_DIR})


@app.after_request
def add_header(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = '*'
    return response


@app.route('/register_user', methods=['GET', 'POST'])
def register_user():
    args = _get_input()
    users = db.users

    if users.find_one({'mail': args_string(args, 'mail')}) is not None:
        return _send_error('user already exists')

    user_record = dict((key, nonempty(args_string(args, key))) for key in ['name', 'mail', 'pass'])
    users.insert_one(user_record)

    return _send_output({'ok': True})


@app.route('/upload_ctor', methods=['POST'])
def upload_ctor():
    args = _get_input()
    ctors = db.ctors

    user_id = auth()
    if isinstance(user_id, dict):
        return user_id  # error

    name = nonempty(args_string(args, 'ctor_name'))
    descr = nonempty(args_string(args, 'ctor_descr')) if 'ctor_descr' in args else ''
    filename = tempfile.mktemp('ctor')

    current_constructor = {}
    #todo remake in pg
    if 'constructor_id' in args:
        res = [c for c in ctors.find() if _ctor_id(c['_id'])==args['constructor_id']]
        if len(res):
            current_constructor = res.pop()
        else:
            return _send_error('Constructor does not exists')

        if current_constructor['user_id'] != user_id:
            return _send_error('Access denied')

    same_named_constructors = list(ctors.find({'ctor_name': name}))
    if 'constructor_id' in args:
        if len([c for c in same_named_constructors if _ctor_id(c['_id'])!=args['constructor_id']]):
            return _send_error('Constructor with this name already exists')
    else:
        if len(same_named_constructors):
            return _send_error('Constructor with this name already exists')

    if 'ctor_file_name' in args:
        uploaded_filename = args['ctor_file_name']
        if not re.findall('^[a-zA-Z][a-zA-Z0-9_]*$', uploaded_filename) or uploaded_filename.startswith('test_'):
            raise ValueError()
        uploaded_filename = "{}.py".format(uploaded_filename)

        copy2(os.path.join(ROOT_DIR, 'constructor_examples', uploaded_filename), filename)

        is_public = True
    elif 'ctor_file' in args:
        file_base64 = re.sub('^data:.+;base64,', '', args['ctor_file'])

        try:
            file_source = base64.b64decode(file_base64).decode('utf-8')
        except Exception:
            return _send_error("Invalid input/0")

        file = open(filename, "w")
        file.write(file_source)
        file.close()

        is_public = False
    else:
        return _send_error("Invalid input")

    if 'constructor_id' in args:
        ctors.replace_one(
            {'_id': current_constructor['_id']},
            {
                'ctor_name': name,
                'ctor_descr': descr,
                'price_eth': float(args['price_eth']) if 'price_eth' in args else .0,
                'is_public': is_public,
                'user_id': user_id
            }
        )
        ctor_engine.register_new_ctor(_ctor_id(current_constructor['_id']), filename)
    else:
        ctor_id = ctors.insert_one(
            {
                'ctor_name': name,
                'ctor_descr': descr,
                'price_eth': float(args['price_eth']) if 'price_eth' in args else .0,
                'is_public': is_public,
                'user_id': user_id
            }
        ).inserted_id

        ctor_engine.register_new_ctor(_ctor_id(ctor_id), filename)

    return _send_output({'ok': True})


@app.route('/list_ctors', methods=['GET', 'POST'])
def list_ctors():
    ctors = db.ctors

    user_id = auth()
    if isinstance(user_id, dict):
        filter = {"is_public": True}
    else:
        filter = {
            "$or": [
                {"is_public": True},
                {"user_id": user_id}
            ]
        }

    return _send_output(list(map(_format_ctor, ctors.find(filter))))

@app.route('/get_ctor_params', methods=['GET', 'POST'])
def get_ctor_params():
    args = _get_input()
    ctors = db.ctors

    ctor_id = nonempty(args_string(args, 'ctor_id'))
    ctor_info = ctors.find_one({'_id': ObjectId(ctor_id)})
    if ctor_info is None:
        return _send_error('ctor is not found')

    params = ctor_engine.get_ctor_params(ctor_id)
    if 'error' == params['result']:
        return _send_engine_error(params)

    return _send_output({
        'ctor_name': ctor_info['ctor_name'],
        'ctor_descr': ctor_info['ctor_descr'] if 'ctor_descr' in ctor_info else '',
        'price_eth': ctor_info.get('price_eth', .0),
        'schema': process_ctor_schema(params['schema']),
        'ui_schema': params.get('ui_schema', dict())
    })


@app.route('/construct', methods=['GET', 'POST'])
def construct():
    args = _get_input()
    ctors = db.ctors
    instances = db.instances

    ctor_id = nonempty(args_string(args, 'ctor_id'))
    ctor_info = ctors.find_one({'_id': ObjectId(ctor_id)})
    if ctor_info is None:
        return _send_error('ctor is not found')

    user_id = auth()
    if isinstance(user_id, dict):
        return user_id  # error

    instance_title = nonempty(args_string(args, 'instance_title'))

    price_eth = ctor_info.get('price_eth', .0)

    ctor_params = ctor_engine.get_ctor_params(ctor_id)
    if isinstance(ctor_params, str):
        return _send_error(ctor_params)

    ctor_schema = process_ctor_schema(ctor_params['schema'])

    validator_cls = validator_for(ctor_schema)
    validator_cls.check_schema(ctor_schema)
    validator = validator_cls(ctor_schema)

    # field -> error string
    errors = dict()
    for error in validator.iter_errors(args['fields']):
        if not error.path:
            return _send_error(error.message)   # global error

        errors[error.path[0]] = error.message

    if errors:
        return _send_output({
            "result": "error",
            "errors": errors
        })

    result = ctor_engine.construct(ctor_id, price_eth, args['fields'])

    assert isinstance(result, dict)
    if 'error' == result['result']:
        return _send_engine_error(result)

    # success
    instance_id = instances.insert_one({'abi': json.dumps(result['abi']), 'source': result['source'],
                                        'bin': result['bin'],
                                        'function_specs': json.dumps(result['function_specs']),
                                        'dashboard_functions': result['dashboard_functions'],
                                        'ctor_id': ctor_id,
                                        'instance_title': instance_title,
                                        'user_id': user_id}
                                       ).inserted_id.binary.hex()

    return _send_output({
        'result': 'success',
        'instance_id': instance_id,
        'bin': result['bin'],
        'source': result['source'],
        'price_eth': price_eth
    })


def _prepare_instance_details(instance_info):
    output = {
        "instance_id": instance_info['_id'].binary.hex(),
        "instance_title": instance_info['instance_title'],
        "network_id": instance_info['network_id'],
        "ctor_id": instance_info['ctor_id'],
        "address": instance_info['address'],
        "abi": json.loads(instance_info['abi']),
        "functions": json.loads(instance_info['function_specs']),
        "dashboard_functions": instance_info['dashboard_functions']
    }
    assert_conforms2schema_part(output, load_schema('internal/front-back.json'),
                                'rpc_calls/get_instance_details/output')

    return output


@app.route('/get_instance_details', methods=['GET', 'POST'])
def get_instance_details():
    args = _get_input()
    instances = db.instances

    instance_id = nonempty(args_string(args, 'instance_id'))
    instance_info = instances.find_one({'_id': ObjectId(instance_id)})
    if instance_info is None:
        return _send_error('instance is not found')

    if not instance_info.get('public_access'):
        user_id = auth()
        if isinstance(user_id, dict):
            return user_id  # error

        if instance_info['user_id'] != user_id:
            return _send_error('instance is not found')

    if 'address' not in instance_info:
        return _send_error('instance is not yet deployed')

    return _send_output(_prepare_instance_details(instance_info))


@app.route('/get_all_instances', methods=['GET', 'POST'])
def get_all_instances():
    instances = db.instances

    user_id = auth()
    if isinstance(user_id, dict):
        return user_id  # error

    found = instances.find({'user_id': user_id, 'address': {'$exists': True}})

    return _send_output([_prepare_instance_details(i) for i in found])


@app.route('/set_instance_address', methods=['GET', 'POST'])
def set_instance_address():
    args = _get_input()
    ctors = db.ctors
    instances = db.instances

    user_id = auth()
    if isinstance(user_id, dict):
        return user_id  # error

    instance_id = nonempty(args_string(args, 'instance_id'))
    instance_info = instances.find_one({'_id': ObjectId(instance_id), 'user_id': user_id})
    if instance_info is None:
        return _send_error('instance is not found')

    instances.update({'_id': ObjectId(instance_id)}, {
        '$set': {
            'address': nonempty(args_string(args, 'address')),
            'network_id': args_int(args, 'network_id'),
            'public_access': bool(args.get('public_access'))
        }
    })

    return _send_output({'ok': True})


@app.route('/list_instances', methods=['GET', 'POST'])
def list_instances():
    args = _get_input()
    ctors = db.ctors
    instances = db.instances

    user_id = auth()
    if isinstance(user_id, dict):
        return user_id  # error

    ctor_id = nonempty(args_string(args, 'ctor_id'))
    ctor_info = ctors.find_one({'_id': ObjectId(ctor_id)})
    if ctor_info is None:
        return _send_error('ctor is not found')

    return _send_output([i['_id'].binary.hex() for i in instances.find({'ctor_id': ctor_id, 'user_id': user_id})])


@app.route('/clearz', methods=['GET'])
def clearz():
    db.ctors.delete_many({})
    db.instances.delete_many({})
    return _send_output({'ok': True})


def l(v):
    print(repr(v), file=sys.stderr)
    return v


def _get_input():
    print('[DEBUG]: got input: {}'.format(request.data))
    return json.loads(request.data)


def _send_error(string):
    print('[ERROR]: {}'.format(string))
    return _send_output({'error': string})

def _send_engine_error(res):
    if 'error_descr' in res:
        return _send_output({'error': res['error_descr']})
    else:
        return _send_output(res)


def _send_output(output):
    return json.dumps(output)


def args_string(args, key):
    v = args[key]

    if not isinstance(v, str):
        raise TypeError()
    if len(v) > 32*1024:
        raise ValueError()

    return v


def args_int(args, key):
    v = args[key]

    if not isinstance(v, int):
        raise TypeError()

    return v


def nonempty(v):
    if not v:
        raise ValueError()
    return v


def auth():
    user_id = request.headers.get('X-AccessToken')

    return user_id if user_id else _send_error('not authorized')


def process_ctor_schema(schema):
    return add_definitions(schema, load_schema('public/ethereum-sc.json'))


def _format_ctor(ctor):
    return {
        'ctor_id': _ctor_id(ctor['_id']),
        'ctor_name': ctor['ctor_name'],
        'price_eth': ctor.get('price_eth', .0),
        'ctor_descr': ctor['ctor_descr'] if 'ctor_descr' in ctor else '',
        'is_public': ctor['is_public'] if 'is_public' in ctor else True,
        'user_id': ctor['user_id'] if 'user_id' in ctor else '',
     }

def _ctor_id(id):
    return id.binary.hex()

if __name__ == '__main__':
    app.run()

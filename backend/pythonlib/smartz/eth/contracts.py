# -*- coding: utf-8 -*-
#
#   smartz.eth.contracts
#

from smartz.json_schema import load_schema, add_definitions, assert_conforms2definition, assert_conforms2schema_part


def abi_arguments2schema(abi_args_array):
    """
    Конвертация массива аргументов функции контракта в json schema, пригодную для отрисовки и валидации в браузере.
    :param abi_args_array: массив аргументов функции контракта в формате Ethereum ABI
    :return: json schema в виде структуры
    """
    def abi_type2schema(abi_type, abi_name=None):
        if 'bool' == abi_type:
            result = {
                "type": "boolean",
                "default": False
            }

        elif abi_type in ('address', 'uint', 'uint256', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128',
                          'bytes1', 'bytes2', 'bytes3', 'bytes4', 'bytes5', 'bytes6', 'bytes7', 'bytes8',
                          'bytes9', 'bytes10', 'bytes11', 'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16',
                          'bytes17', 'bytes18', 'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24',
                          'bytes25', 'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32',
                          'bytes',
                          ):
            result = {
                "$ref": "#/definitions/" + abi_type
            }

        elif 'string' == abi_type:
            result = {
                "type": "string"
            }

        elif abi_type.endswith('[]'):
            result = {
                "type": "array",
                "items": abi_type2schema(abi_type[:-2])
            }

        else:
            raise NotImplementedError('ABI type is not supported: {}'.format(abi_type))

        if abi_name is not None:
            result['title'] = abi_name

        return result

    schema = {
        "type": "array",
        "minItems": len(abi_args_array),
        "maxItems": len(abi_args_array),
    }
    if len(abi_args_array) > 0:
        schema["items"] = [abi_type2schema(arg['type'], arg.get("name")) for arg in abi_args_array]
        return add_definitions(schema, load_schema('public/ethereum-sc.json'))
    else:
        return schema


def make_generic_function_spec(abi_array):
    """
    Generates ETHFunctionSpec for each function found in ABI.
    :param abi_array: contract Ethereum ABI
    :return: list of ETHFunctionSpec
    """
    def fn2spec(fn):
        spec = dict()

        if fn['type'] == 'function':
            for attr in ("name", "constant", "payable"):
                spec[attr] = fn[attr]

            spec['title'] = fn['name']  # to be extended by contract author
            spec['inputs'] = abi_arguments2schema(fn['inputs'])
            spec['outputs'] = abi_arguments2schema(fn['outputs'])

        elif fn['type'] == 'fallback':
            spec = {
                'name': '',
                'title': '',
                'constant': False,
                'payable': fn['payable'],
                'inputs': abi_arguments2schema([]),
                'outputs': abi_arguments2schema([])
            }

        else:
            assert False

        assert_conforms2definition(spec, load_schema('internal/front-back.json'), 'ETHFunctionSpec')

        return spec

    return [fn2spec(fn) for fn in abi_array if fn['type'] in ('function', 'fallback')]


def merge_function_titles2specs(spec_array, titles_info):
    """
    Attach human-friendly titles and descriptions to passed ETHFunctionSpec list.

    Processed elements: function titles and descriptions, function input arguments titles and descriptions,
    titles and descriptions of function outputs.

    :param spec_array: list of ETHFunctionSpec
    :param titles_info: data according to function_titles_info.json schema
    :return: modified ETHFunctionSpec
    """
    assert_conforms2schema_part(
        titles_info, load_schema('public/constructor.json'), 'definitions/ETHFunctionAdditionalDescriptions'
    )

    def set_title(to_spec, from_info):
        # todo how to deduplicate with json schema?
        fields = (
            'title', 'description', 'sorting_order', 'ui:widget', 'ui:widget_options',
            'payable_details', 'ui:options', 'icon'
        )
        for field in fields:
            if field in from_info:
                to_spec[field] = from_info[field]

    for spec in spec_array:
        fn_titles = titles_info.get(spec['name'])
        if not fn_titles:
            continue

        set_title(spec, fn_titles)

        for io in ('inputs', 'outputs'):
            if not (io in fn_titles and 'items' in spec[io]):
                continue

            for (idx, arg_titles) in enumerate(fn_titles[io]):
                if idx >= len(spec[io]["items"]):
                    break

                set_title(spec[io]["items"][idx], arg_titles)

    return spec_array

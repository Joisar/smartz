import * as dateFormat from 'dateformat';


// make flatten object from deep hierarchy obj
// where 'key' is path to 'value'
// value is array or string
export function transformObj2Flat(obj) {
    const result = {};

    // convert to flatten object as {'pathToValue': value, ...}
    function makeFlatObject(obj, resultObj, path = '') {
        Object.keys(obj).forEach((item) => {
            const pa = path === '' ? `${item}` : `${path} > ${item}`;

            if (Array.isArray(obj[item]) || typeof obj[item] === 'string') {
                resultObj[`${pa}`] = typeof obj[item] === 'string' ? `${obj[item]}` : obj[item];
            } else if (typeof obj[item] === 'object') {
                makeFlatObject(obj[item], resultObj, pa);
            }
        });
    }

    makeFlatObject(obj, result);
    return result;
}

// search field title in json schema
export function findTitle(schema, field) {
    Object.keys(schema).forEach((item) => {
        if (item === field && typeof schema[item] === 'object') {
            // todo: make logic
        }
    });
}

export function formatTime(timeISO) {
    const dataFromIso = new Date(timeISO);
    const diffTime = (new Date().getTime()) - dataFromIso.getTime();
    const dayTimeInMs = 24 * 60 * 60 * 1000;

    return diffTime < dayTimeInMs
        ? dateFormat(dataFromIso, 'HH:MM:ss')
        : dateFormat(dataFromIso, 'mmm dd');
}

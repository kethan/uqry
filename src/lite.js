const isEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== typeof b) return false;
    if (typeof a === 'object') {
        if ((a.map) !== (b.map)) return false;
        const keysA = Object.keys(a), keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every(key => isEqual(a[key], b[key]));
    }
    return false;
};

const dlv = (obj, key) => (Array.isArray(key) ? key : key.split('.')).reduce((a, b) => (a ? a[b] : a), obj);
const add = (w, op, fn) => ops[op] = fn;

const ops = {
    $eq: isEqual,
    $ne: (query, value) => !isEqual(query, value),
    $gt: (query, value) => value > query,
    $gte: (query, value) => value >= query,
    $lt: (query, value) => value < query,
    $lte: (query, value) => value <= query,
    $in: (query, value) => (Array.isArray(query) ? query : [query]).some(item => filter(item)(value)),
    $nin: (query, value) => !(Array.isArray(query) ? query : [query]).some(item => filter(item)(value)),
    $and: (query, value) => query.every(q => filter(q)(value)),
    $or: (query, value) => query.some(q => filter(q)(value)),
    $not: (query, value) => !filter(query)(value),

    $regex: (query, value) => new RegExp(query).test(value),
    $exists: (_, value) => value !== undefined,
    $type: (query, value) => typeof value === query,

    $elemMatch: (query, value) => (Array.isArray(value) ? value : [value]).some(item => filter(query)(item)),
    $all: (query, value) => Array.isArray(value) && query.every((v) => value.some(item => filter(v)(item))),
    $size: (query, value) => Array.isArray(value) ? value.length === query : false,
};


const filter = (query) => (context) => {
    if (typeof query === 'object' && !Array.isArray(query)) {
        return Object.entries(query).every(([key, value]) => {
            if (typeof key === 'string' && key.startsWith('$')) {
                return ops[key](value, context);
            }
            return filter(value)(dlv(context, key));
        });
    }
    return isEqual(context, query);
};

export {
    isEqual,
    add,
    filter
}
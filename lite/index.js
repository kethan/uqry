const eq = (a, b, keys, ctor) => a === b || (
    a && b && (ctor = a.constructor) === b.constructor
        ? ctor === Array ? a.length === b.length && a.every((val, idx) => eq(val, b[idx]))
            : ctor === Object && (keys = ctor.keys(a)).length === ctor.keys(b).length && keys.every((k) => k in b && eq(a[k], b[k]))
        : (a !== a && b !== b)
);

const dlv = (obj, key) => (Array.isArray(key) ? key : key.split('.')).reduce((a, b) => (a ? a[b] : a), obj);
const add = (w, op, fn) => ops[op] = fn;

const ops = {
    $eq: eq,
    $ne: (query, value) => !eq(query, value),
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
    return eq(context, query);
};

export {
    eq,
    add,
    filter
}
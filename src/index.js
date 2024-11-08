// Helper function to compare equality of objects
const eq = (a, b, keys, ctor) => a === b || (
    a && b && (ctor = a.constructor) === b.constructor
        ? ctor === Array ? a.length === b.length && a.every((val, idx) => eq(val, b[idx]))
            : ctor === Object && (keys = ctor.keys(a)).length === ctor.keys(b).length && keys.every((k) => k in b && eq(a[k], b[k]))
        : (a !== a && b !== b)
);

const isObject = (obj) => typeof obj === 'object' && !Array.isArray(obj);
const is$ = (obj) => typeof obj === 'string' && obj.startsWith('$');

// Nested property access function
const dlv = (obj, key) => (Array.isArray(key) ? key : key.split('.')).reduce((a, b) => (a ? a[b] : a), obj);

// Filter operations
const filterOps = {
    $eq: (query, value) => eq(query, value),
    $ne: (query, value) => !eq(query, value),
    $gt: (query, value) => value > query,
    $gte: (query, value) => value >= query,
    $lt: (query, value) => value < query,
    $lte: (query, value) => value <= query,
    $in: (query, value) => (Array.isArray(query) ? query : [query]).some(val => eq(val, value)),
    $nin: (query, value) => !(Array.isArray(query) ? query : [query]).some(val => eq(val, value)),
    $and: (query, value) => query.every(clause => filter(clause)(value)),
    $or: (query, value) => query.some(clause => filter(clause)(value)),
    $not: (query, value) => !filter(query)(value),

    $regex: (query, value) => new RegExp(query).test(value),
    $expr: (query, value) => expression(query)(value),
    $exists: (query, value) => query === !!value,
    $type: (query, value) => typeof value === query,

    $mod: (query, value) => (value % query[0]) === query[1],
    $elemMatch: (query, value) => (Array.isArray(value) ? value : [value]).some(item => filter(query)(item)),
    $all: (query, value) => Array.isArray(value) && query.every((v) => value.some(item => filter(v)(item))),
    $size: (query, value) => Array.isArray(value) ? value.length === query : false,
    $where: function (query, value) { return query.call(value) }
};

// Aggregation operations
const expressionOps = {
    $add: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a + b, 0),
    $subtract: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a - b),
    $multiply: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a * b, 1),
    $divide: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a / b),

    $concat: (args, context) => args.map(arg => expression(arg)(context)).join(''),

    $min: (args, context) => Math.min(...args.flatMap(arg => expression(arg)(context))),
    $max: (args, context) => Math.max(...args.flatMap(arg => expression(arg)(context))),
    $avg: (args, context) => args.flatMap(arg => expression(arg)(context)).reduce((a, b) => a + b, 0) / args.length,
    $sum: (args, context) => args.flatMap(arg => expression(arg)(context)).reduce((a, b) => a + b, 0),
    $cond: ([condition, trueExpr, falseExpr], context) => expression(condition)(context) ? expression(trueExpr)(context) : expression(falseExpr)(context),

    $eq: ([a, b], context) => eq(expression(a)(context), expression(b)(context)),
    $ne: ([a, b], context) => !eq(expression(a)(context), expression(b)(context)),
    $gt: ([a, b], context) => expression(a)(context) > expression(b)(context),
    $gte: ([a, b], context) => expression(a)(context) >= expression(b)(context),
    $lt: ([a, b], context) => expression(a)(context) < expression(b)(context),
    $lte: ([a, b], context) => expression(a)(context) <= expression(b)(context),

    $in: ([a, b], context) => (Array.isArray(b) ? expression(b)(context) : expression([b])(context)).some(val => eq(expression(a)(context), val)),
    $nin: ([a, b], context) => !(Array.isArray(b) ? expression(b)(context) : expression([b])(context)).some(val => eq(expression(a)(context), val)),

    $and: (args, context) => args.every(arg => expression(arg)(context)),
    $or: (args, context) => args.some(arg => expression(arg)(context)),
    $not: (args, context) => !expression(args[0])(context),
    $switch: (args, context) => {
        const { branches, default: defaultCase } = args[0];
        for (const branch of branches) {
            if (expression(branch.case)(context)) {
                return expression(branch.then)(context);
            }
        }
        return expression(defaultCase)(context);
    },
};

// Pipeline stages
const stagesOps = {
    $project: (projection, context) => {
        const result = {};
        const excludeFields = Object.keys(projection).filter((v) => projection[v] === 0);
        if (excludeFields.length) {
            Object.keys(context).forEach((key) => {
                if (!excludeFields.includes(key)) {
                    result[key] = dlv(context, key)
                }
            });
        } else {
            Object.keys(projection).forEach((key) => {
                result[key] = !(projection[key] === 1 || projection[key] === 0) ? expression(projection[key])(context)
                    : dlv(context, key)
            });
        }
        return result;
    },    
    $match: (criteria, context) => filter(criteria)(context) ? context : null,
    $group: ({ _id, ...accumulators }, contextArray) => {
        const groups = contextArray.reduce((acc, item) => {
            const groupKey = _id === null ? null : expression(_id)(item);
            if (!acc[groupKey]) acc[groupKey] = { _id: groupKey };
            Object.entries(accumulators).forEach(([key, expr]) => {
                if (!acc[groupKey][key]) acc[groupKey][key] = [];
                acc[groupKey][key].push(expression(expr)(item));
            });
            return acc;
        }, {});

        return Object.values(groups).map(group => {
            Object.entries(group).forEach(([key, values]) => {
                if (key !== '_id') {
                    const [op] = Object.entries(accumulators[key])[0];
                    group[key] = expressionOps[op](values, {});
                }
            });
            return group;
        });
    },
    $sort: (sortObj, contextArray) => {
        const [key, order] = Object.entries(sortObj)[0];
        return [...contextArray].sort((a, b) => (dlv(a, key) > dlv(b, key) ? order : -order));
    },
    $skip: (count, contextArray) => [...contextArray].slice(count),
    $limit: (count, contextArray) => [...contextArray].slice(0, count),
    $count: (fieldName, contextArray) => [{ [fieldName]: contextArray.length }],
};

const add = (which, op, fn) => {
    if (which === 'filter') filterOps[op] = fn;
    if (which === 'stage') stagesOps[op] = fn;
    if (which === 'expression') expressionOps[op] = fn;
}

// Filter function
const filter = (query) => (value) => {
    if (isObject(query)) {
        return Object.entries(query).every(([key, subFilter]) => {
            if (is$(key)) {
                return filterOps[key](subFilter, value);
            }
            return filter(subFilter)(dlv(value, key));
        });
    }
    return eq(value, query);
};

// Expression evaluation based on context
const expression = (expr) => (context) => {
    if (is$(expr)) {
        return dlv(context, expr.slice(1));
    }
    if (isObject(expr)) {
        const [operator, args] = Object.entries(expr)[0];
        if (expressionOps[operator]) {
            return expressionOps[operator](Array.isArray(args) ? args : [args], context);
        }
    }
    return expr;
};

// Aggregate function
const aggregate = (pipelines) => (docs) => {
    return pipelines.reduce((currentDoc, stage) => {
        const [operator, args] = Object.entries(stage)[0];
        if (stagesOps[operator]) {
            if (['$project', '$match'].includes(operator)) {
                return currentDoc.map(context => stagesOps[operator](args, context)).filter(Boolean);
            } else {
                return stagesOps[operator](args, currentDoc);
            }
        }
    }, docs);
};

export { filter, expression, aggregate, add, eq };
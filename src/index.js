// Helper function to compare equality of objects
const isEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== typeof b) return false;
    if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        const keysA = Object.keys(a), keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every(key => isEqual(a[key], b[key]));
    }
    return false;
};

const isObject = (obj) => typeof obj === 'object' && !Array.isArray(obj);
const is$ = (obj) => typeof obj === 'string' && obj.startsWith('$');

// Nested property access function
const dlv = (obj, key) => (Array.isArray(key) ? key : key.split('.')).reduce((a, b) => (a ? a[b] : a), obj);

// Filter operations
const filterOps = {
    $eq: (query, value) => isEqual(query, value),
    $ne: (query, value) => !isEqual(query, value),
    $gt: (query, value) => value > query,
    $gte: (query, value) => value >= query,
    $lt: (query, value) => value < query,
    $lte: (query, value) => value <= query,
    $in: (query, value) => query.some(val => value.includes(val)),
    $nin: (query, value) => !query.some(val => value.includes(val)),
    $and: (query, value) => query.every(clause => filter(clause)(value)),
    $or: (query, value) => query.some(clause => filter(clause)(value)),
    $not: (query, value) => !filter(query)(value),

    $regex: (query, value) => new RegExp(query).test(value),
    $expr: (query, value) => expression(query)(value),
    $exists: (_, value) => value !== undefined,
    $type: (query, value) => typeof value === query,

    $mod: (query, value) => (value % query[0]) === query[1],
    $elemMatch: (query, value) => (!Array.isArray(value)) ? false : value.some(item => filter(query)(item)),
    $all: (query, value) => (!Array.isArray(value)) ? false : query.every(q => value.includes(q)),
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

    $min: (args, context) => Math.min(...args.map(arg => expression(arg)(context))),
    $max: (args, context) => Math.max(...args.map(arg => expression(arg)(context))),
    $avg: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a + b, 0) / args.length,
    $sum: (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a + b, 0),
    $cond: ([condition, trueExpr, falseExpr], context) => expression(condition)(context) ? expression(trueExpr)(context) : expression(falseExpr)(context),

    $eq: ([a, b], context) => isEqual(expression(a)(context), expression(b)(context)),
    $ne: ([a, b], context) => !isEqual(expression(a)(context), expression(b)(context)),
    $gt: ([a, b], context) => expression(a)(context) > expression(b)(context),
    $gte: ([a, b], context) => expression(a)(context) >= expression(b)(context),
    $lt: ([a, b], context) => expression(a)(context) < expression(b)(context),
    $lte: ([a, b], context) => expression(a)(context) <= expression(b)(context),

    $in: ([a, b], context) => expression(b)(context).includes(expression(a)(context)),
    $nin: ([a, b], context) => !expression(b)(context).includes(expression(a)(context)),

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
const pipelineOps = {
    $project: (projection, context) => {
        const result = {};
        Object.entries(projection).forEach(([key, value]) => {
            result[key] = value === 1 ? dlv(context, key) : expression(value)(context);
        });
        return result;
    },
    $match: (criteria, context) => filter(criteria)(context) ? context : null,
    $group: ({ _id, ...accumulators }, contextArray) => {
        const groups = contextArray.reduce((acc, item) => {
            const groupKey = expression(_id)(item);
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
    if (which === 'pipeline') pipelineOps[op] = fn;
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
    return isEqual(value, query);
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
const aggregate = (pipeline) => (contextArray) => {
    return pipeline.reduce((currentContextArray, stage) => {
        const [operator, args] = Object.entries(stage)[0];
        if (pipelineOps[operator]) {
            if (['$group', '$sort', '$skip', '$limit', '$count'].includes(operator)) {
                return pipelineOps[operator](args, currentContextArray);
            } else {
                return currentContextArray.map(context => pipelineOps[operator](args, context)).filter(Boolean);
            }
        }
    }, contextArray);
};

export { filter, expression, aggregate, add };
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
    $in: (query, value) => (Array.isArray(query) ? query : [query]).some(val => isEqual(val, value)),
    $nin: (query, value) => !(Array.isArray(query) ? query : [query]).some(val => isEqual(val, value)),
    $and: (query, value) => query.every(clause => filter(clause)(value)),
    $or: (query, value) => query.some(clause => filter(clause)(value)),
    $not: (query, value) => !filter(query)(value),

    $regex: (query, value) => new RegExp(query).test(value),
    $expr: (query, value) => expression(query)(value),
    $exists: (_, value) => value !== undefined,
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

    $in: ([a, b], context) => (Array.isArray(b) ? expression(b)(context) : expression([b])(context)).some(val => isEqual(expression(a)(context), val)),
    $nin: ([a, b], context) => !(Array.isArray(b) ? expression(b)(context) : expression([b])(context)).some(val => isEqual(expression(a)(context), val)),

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
            // const groupKey = expression(_id)(item);
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
    $unwind: (args, contextArray) => {
        const field = typeof args === 'string' ? args.slice(1) : args.path.slice(1);
        const includeArrayIndex = args.includeArrayIndex || null;
        const preserveNullAndEmptyArrays = args.preserveNullAndEmptyArrays || false;
        return contextArray.flatMap(doc => {
            const array = dlv(doc, field);
            if (array === null) {
                return preserveNullAndEmptyArrays ? [{ ...doc, [field]: null, ...(includeArrayIndex ? { [includeArrayIndex]: null } : {}) }] : [];
            }

            if (array === undefined || (Array.isArray(array) && array.length === 0)) {
                return preserveNullAndEmptyArrays ? [(delete doc[field], { ...doc, ...(includeArrayIndex ? { [includeArrayIndex]: null } : {}) })] : []
            }

            if (typeof array === "string") {
                return [{ ...doc, [field]: array, ...(includeArrayIndex ? { [includeArrayIndex]: null } : {}) }];
            }

            return array.map((elem, index) => ({ ...doc, [field]: elem, ...(includeArrayIndex ? { [includeArrayIndex]: index } : {}) }));
        });
    },
    $lookup: (args, contextArray) => {
        const { from, localField, let: letVars, foreignField, as, pipeline } = args;
        return contextArray.map(doc => {
            let joinedDocs = [];

            if (localField && foreignField) {
                const localValue = dlv(doc, localField);
                const fromCollection = from;
                joinedDocs = fromCollection.filter(foreignDoc => dlv(foreignDoc, foreignField) === localValue);
            } else if (pipeline) {
                let v, localVars = {};
                Object.keys(letVars).forEach(varName => {
                    localVars[`$$${varName}`] = dlv(doc, letVars[varName].slice(1));
                });
                joinedDocs = aggregate(pipeline.map(pipe =>
                    JSON.parse(
                        JSON.stringify(pipe).replace(/\"\$\$\w+\"/g, (match) =>
                            (v = localVars[match.replace(/\"/g, "")], typeof v === "string" ? `"${v}"` : v))
                    )
                )
                )(from);
            }
            return { ...doc, [as]: joinedDocs };
        });
    }
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
const aggregate = (pipeline) => (docs) => {
    return pipeline.reduce((currentDoc, stage) => {
        const [operator, args] = Object.entries(stage)[0];
        if (pipelineOps[operator]) {
            if (['$project', '$match'].includes(operator)) {
                return currentDoc.map(context => pipelineOps[operator](args, context)).filter(Boolean);
            } else {
                return pipelineOps[operator](args, currentDoc);
            }
        }
    }, docs);
};

export { filter, expression, aggregate, add, isEqual };


// console.log(aggregate
//     ([{
//         $unwind: { path: '$items', includeArrayIndex: "index", preserveNullAndEmptyArrays: true }
//         // $lookup: {
//         //     from: [
//         //         { "_id": 1, "item": "apple", "price": 1.00 },
//         //         { "_id": 2, "item": "banana", "price": 0.50 }
//         //     ], localField: 'itemId', foreignField: '_id', as: 'itemDetails'
//         // }

//     }])
//     ([
//         {
//             "_id": 1,
//             "orderDate": "2024-08-01",
//             data: {
//                 "items": [
//                     "apple",
//                     "banana"
//                 ]
//             },
//             "items": [
//                 "apple",
//                 "banana"
//             ]
//         },
//         {
//             "_id": 2,
//             "orderDate": "2024-08-02",
//             data: {
//                 "items": [
//                     "orange",
//                     "kiwi"
//                 ]
//             },
//             "items": [
//                 "orange",
//                 "kiwi"
//             ]
//         },
//         {
//             "_id": 3,
//             "orderDate": "2024-08-02",
//             data: {
//                 "items": []
//             },
//             "items": "a"
//         },
//         {
//             "_id": 4,
//             "orderDate": "2024-08-02",
//             data: {
//                 "items": [
//                     null,
//                     null
//                 ]
//             },
//             "items": [
//                 null,
//                 null
//             ]
//         },
//         {
//             "_id": 5,
//             "orderDate": "2024-08-02",
//             data: {
//                 "items": null
//             },
//             items: null
//         },
//         {
//             "_id": 6,
//             "orderDate": "2024-08-02"
//         }
//     ]));


const orders = [
    { "_id": 1, "item": "almonds", "price": 12, "ordered": 2 },
    { "_id": 2, "item": "pecans", "price": 20, "ordered": 1 },
    { "_id": 3, "item": "cookies", "price": 10, "ordered": 60 }
]

const warehouses = [
    { "_id": 1, "stock_item": "almonds", warehouse: "A", "instock": 120 },
    { "_id": 2, "stock_item": "pecans", warehouse: "A", "instock": 80 },
    { "_id": 3, "stock_item": "almonds", warehouse: "B", "instock": 60 },
    { "_id": 4, "stock_item": "cookies", warehouse: "B", "instock": 40 },
    { "_id": 5, "stock_item": "cookies", warehouse: "A", "instock": 80 }
]

console.log(JSON.stringify(aggregate([{
    $lookup:
    {
        from: warehouses,
        let: { order_item: "$item", order_qty: "$ordered" },
        // localField: '_id', foreignField: '_id',
        as: "stockdata",
        pipeline: [
            {
                $match:
                {
                    $expr:
                    {
                        $and:
                            [
                                { $eq: ["$stock_item", "$$order_item"] },
                                { $gte: ["$instock", "$$order_qty"] }
                            ]
                    }
                }
            },
            { $project: { stock_item: 0, _id: 0 } }
        ],

    }
}])(orders), null, 2));

// const orders = [{ "_id": 1, "item": "almonds", "price": 12, "ordered": 2 },
// { "_id": 2, "item": "pecans", "price": 20, "ordered": 1 },
// { "_id": 3, "item": "cookies", "price": 10, "ordered": 60 }];

// const warehouses = [
//     { "_id" : 1, "stock_item" : "almonds", warehouse: "A", "instock" : 120 },
//     { "_id" : 2, "stock_item" : "pecans", warehouse: "A", "instock" : 80 },
//     { "_id" : 3, "stock_item" : "almonds", warehouse: "B", "instock" : 60 },
//     { "_id" : 4, "stock_item" : "cookies", warehouse: "B", "instock" : 40 },
//     { "_id" : 5, "stock_item" : "cookies", warehouse: "A", "instock" : 80 }
//   ];

// const lookupArgs = {
//     from: products,
//     localField: 'productId',
//     foreignField: '_id',
//     as: 'productDetails',
//     pipeline: [
//         { $match: { $expr: { $eq: ['$category', 'Electronics'] } } }, // Filter by category
//         { $addFields: { quantityFromOrder: { $let: { vars: { quantity: '$$quantity' }, in: '$$quantity' } } } }, // Add quantity from `let`
//         { $project: { name: 1, price: 1, quantityFromOrder: 1 } } // Project fields
//     ],
//     let: { quantity: "$quantity" } // Pass `quantity` from the `orders` document to the pipeline
// };

// const result = $lookup({
//     from: warehouses,
//     let: { order_item: "$item", order_qty: "$ordered" },
//     pipeline: [
//        { $match:
//           { $expr:
//              { $and:
//                 [
//                   { $eq: [ "$stock_item",  "$$order_item" ] },
//                   { $gte: [ "$instock", "$$order_qty" ] }
//                 ]
//              }
//           }
//        },
//        { $project: { stock_item: 0, _id: 0 } }
//     ],
//     as: "stockdata"
//   }, orders);

// console.log(result);

// console.log(JSON.stringify(aggregate([{
//     $lookup: {
//         from: [
//             { "_id": 1, "item": "apple", "price": 1.00 },
//             { "_id": 2, "item": "banana", "price": 0.50 }
//         ], localField: 'itemId', foreignField: '_id', as: 'itemDetails'
//     }
// }])([
//     { "_id": 1, "orderDate": "2024-08-01", "itemId": 1 },
//     { "_id": 2, "orderDate": "2024-08-02", "itemId": 2 }
// ]), null, 2));



// console.log(aggregate(
//     [
//         {
//             $match:
//             {
//                 $expr:
//                 {
//                     $and:
//                         [
//                             { $eq: ["$stock_item", "almonds"] },
//                             { $gte: ["$instock", 60] }
//                         ]
//                 }
//             }
//         },
//         { $project: { stock_item: 0, _id: 0 } }
//     ]
// )(
//     [
//         { "_id": 1, "stock_item": "almonds", warehouse: "A", "instock": 120 },
//         { "_id": 2, "stock_item": "pecans", warehouse: "A", "instock": 80 },
//         { "_id": 3, "stock_item": "almonds", warehouse: "B", "instock": 60 },
//         { "_id": 4, "stock_item": "cookies", warehouse: "B", "instock": 40 },
//         { "_id": 5, "stock_item": "cookies", warehouse: "A", "instock": 80 }
//     ]
// ));



const users = [
    { userId: 1, name: 'Alice' },
    { userId: 2, name: 'Bob' },
];

const orders1 = [
    { orderId: 101, userId: 1, amount: 50, stock_item: 'item1', instock: 30 },
    { orderId: 102, userId: 2, amount: 75, stock_item: 'item2', instock: 15 },
    { orderId: 103, userId: 1, amount: 100, stock_item: 'item1', instock: 20 },
];

const pipeline = [
    {
        $lookup: {
            from: orders1,
            let: { userId: '$userId' },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$userId', '$$userId'] },
                                { $gte: ['$instock', 20] }
                            ]
                        }
                    }
                },
                { $project: { orderId: 1, amount: 1, stock_item: 1, instock: 1 } }
            ],
            as: 'userOrders'
        }
    },
    {
        $project: {
            name: 1,
            userOrders: 1
        }
    }
];



console.log(JSON.stringify(aggregate(pipeline)(users), null, 2))



console.log(aggregate([

    // {
    //     $addFields: {
    //         noOfTags: {
    //             $size: "$tags"
    //         }
    //     }
    // }
    { $unwind: "$tags" },
    { $group: { _id: '$_id', noOfTags: { $sum: 1 } } },
    { $group: { _id: null, avg: { $avg: "$noOfTags" } } },
])
    (
        [{
            _id: 1,
            name: "John Doe",
            age: 30,
            tags: ["programming", "hiking"]
        },

        {
            _id: 2,
            name: "Jack Doe",
            age: 40,
            tags: ["a", "b"]
        }]
    ));

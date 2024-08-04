import { filter, expression, aggregate, add, isEqual } from './src/index.js';

const describe = (title, call) => {
    console.log(title);
    call();
}
function test(message, callback) {
    try {
        callback();
        console.log(`✅ PASS: ${message}`);
    } catch (error) {
        console.error(`❌ FAIL: ${message}`);
        console.error(error);
    }
}

const runTests = (testCases) => {
    testCases.forEach(testCase => {
        const output = testCase.input();
        test(testCase.title, () => {
            const passed = isEqual(output, testCase.expected);
            if (!passed) {
                throw new Error(`Expected: ${JSON.stringify(testCase.expected, null, 2)}, Actual: ${JSON.stringify(output, null, 2)}`);
            }
        });
    });
}

describe('Filter Test', () => {
    const data = [
        { name: 'Alice', age: 25, city: 'New York', scores: [12, 13, 14], friends: [{ name: 'Bob', age: 26 }, { name: 'John', age: 34 }] },
        { name: 'Bob', age: 30, city: 'San Francisco', scores: [12], friends: [{ name: 'Jane', age: 30 }] },
        { name: 'Charlie', age: 35, city: 'New York', scores: [13, 14], friends: [{ name: 'Jack', age: 31 }, { name: 'John', age: 34 }, { name: 'Paul', age: 42 }] },
    ];

    runTests([
        {
            title: '$eq',
            input: () => data.filter(filter({ age: { $eq: 25 } })),
            expected: [data[0]]
        },
        {
            title: '$ne',
            input: () => data.filter(filter({ age: { $ne: 25 } })),
            expected: [data[1], data[2]]
        },
        {
            title: '$gt',
            input: () => data.filter(filter({ age: { $gt: 25 } })),
            expected: [data[1], data[2]]
        },
        {
            title: '$gte',
            input: () => data.filter(filter({ age: { $gte: 25 } })),
            expected: [data[0], data[1], data[2]]
        },
        {
            title: '$lt',
            input: () => data.filter(filter({ age: { $lt: 30 } })),
            expected: [data[0]]
        },
        {
            title: '$lte',
            input: () => data.filter(filter({ age: { $lte: 30 } })),
            expected: [data[0], data[1]]
        },
        {
            title: '$in',
            input: () => data.filter(filter({ city: { $in: ['New York', 'San Francisco'] } })),
            expected: [data[0], data[1], data[2]]
        },
        {
            title: '$nin',
            input: () => data.filter(filter({ city: { $nin: ['New York', 'San Francisco'] } })),
            expected: []
        },
        {
            title: '$and',
            input: () => data.filter(filter({ $and: [{ city: 'New York' }, { age: { $gt: 30 } }] })),
            expected: [data[2]]
        },
        {
            title: '$or',
            input: () => data.filter(filter({ $or: [{ city: 'New York' }, { age: { $lt: 30 } }] })),
            expected: [data[0], data[2]]
        },
        {
            title: '$not',
            input: () => data.filter(filter({ $not: { city: 'New York' } })),
            expected: [data[1]]
        },
        {
            title: '$regex',
            input: () => data.filter(filter({ city: { $regex: 'S.*' } })),
            expected: [data[1]]
        },
        {
            title: '$exists',
            input: () => data.filter(filter({ city: { $exists: true } })),
            expected: [data[0], data[1], data[2]]
        },
        {
            title: '$expr',
            input: () => data.filter(filter({ $expr: { $eq: ['$age', 25] } })),
            expected: [data[0]]
        },
        {
            title: '$type',
            input: () => data.filter(filter({ age: { $type: 'number' } })),
            expected: [data[0], data[1], data[2]]
        },
        {
            title: '$mod',
            input: () => data.filter(filter({ age: { $mod: [10, 5] } })),
            expected: [data[0], data[2]]
        },
        {
            title: '$size',
            input: () => data.filter(filter({ scores: { $size: 2 } })),
            expected: [data[2]]
        },
        {
            title: '$elemMatch',
            input: () => data.filter(filter({ friends: { $elemMatch: { age: { $gt: 40 } } } })),
            expected: [data[2]]
        },
        {
            title: '$all',
            input: () => data.filter(filter({ scores: { $all: [12, 13, 14] } })),
            expected: [data[0]]
        },
        {
            title: '$all',
            input: () => data.filter(filter({
                friends: {
                    $all: [{
                        $elemMatch: { age: { $gte: 34 }, name: 'John' }
                    }]
                }
            })),
            expected: [data[0], data[2]]
        },
        {
            title: '$where',
            input: () => data.filter(filter({ $where: function () { return this.age > 25 } })),
            expected: [data[1], data[2]]
        }
    ])

});

describe('Expression Test', () => {
    const context = { a: 5, b: 10, c: 20 };

    runTests([
        {
            title: '$add',
            input: () => expression({ $add: ['$a', '$b'] })(context),
            expected: 15
        },
        {
            title: '$subtract',
            input: () => expression({ $subtract: ['$b', '$a'] })(context),
            expected: 5
        },
        {
            title: '$multiply',
            input: () => expression({ $multiply: ['$a', '$c'] })(context),
            expected: 100
        },
        {
            title: '$divide',
            input: () => expression({ $divide: ['$c', '$a'] })(context),
            expected: 4
        },
        {
            title: '$eq',
            input: () => expression({ $eq: ['$a', 5] })(context),
            expected: true
        },
        {
            title: '$ne',
            input: () => expression({ $ne: ['$a', 10] })(context),
            expected: true
        },
        {
            title: '$gt',
            input: () => expression({ $gt: ['$c', '$b'] })(context),
            expected: true
        },
        {
            title: '$lt',
            input: () => expression({ $lt: ['$a', '$b'] })(context),
            expected: true
        },
        {
            title: '$gte',
            input: () => expression({ $gte: ['$b', 10] })(context),
            expected: true
        },
        {
            title: '$lte',
            input: () => expression({ $lte: ['$a', 5] })(context),
            expected: true
        },
        {
            title: '$in',
            input: () => expression({ $in: ['$a', 5] })(context),
            expected: true
        },
        {
            title: '$in',
            input: () => expression({ $nin: ['$a', [4, 6]] })(context),
            expected: true
        }
    ]);
});

describe('Aggregate Test', () => {
    const data = [
        { name: 'Alice', age: 25, score: 80 },
        { name: 'Bob', age: 30, score: 90 },
        { name: 'Charlie', age: 35, score: 85 }
    ];

    runTests([
        {
            title: '$group by age',
            input: () => aggregate([{ $group: { _id: '$age', totalScore: { $sum: '$score' } } }])(data),
            expected: [
                { _id: 25, totalScore: 80 },
                { _id: 30, totalScore: 90 },
                { _id: 35, totalScore: 85 }
            ]
        },
        {
            title: '$sort by age',
            input: () => aggregate([{ $sort: { age: -1 } }])(data),
            expected: [
                { name: 'Charlie', age: 35, score: 85 },
                { name: 'Bob', age: 30, score: 90 },
                { name: 'Alice', age: 25, score: 80 }
            ]
        },
        {
            title: '$skip first item',
            input: () => aggregate([{ $skip: 1 }])(data),
            expected: [
                { name: 'Bob', age: 30, score: 90 },
                { name: 'Charlie', age: 35, score: 85 }
            ]
        },
        {
            title: '$limit to two items',
            input: () => aggregate([{ $limit: 2 }])(data),
            expected: [
                { name: 'Alice', age: 25, score: 80 },
                { name: 'Bob', age: 30, score: 90 }
            ]
        },
        {
            title: '$count total items',
            input: () => aggregate([{ $count: 'total' }])(data),
            expected: [{ total: 3 }]
        }
    ]);
});

describe('Add Operation Test', () => {
    const data = [
        { name: 'Alice', age: 25, city: 'New York', score: 80, friends: [{ name: 'Bob', age: 26 }, { name: 'John', age: 34 }] },
        { name: 'Bob', age: 30, city: 'San Francisco', score: 90, friends: [{ name: 'Jane', age: 30 }] },
        { name: 'Charlie', age: 35, city: 'New York', score: 85, friends: [{ name: 'Jack', age: 26 }, { name: 'John', age: 34 }, { name: 'Paul', age: 42 }] }
    ];

    // Add custom operators for testing
    add('expression', '$subtract', (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a - b));
    add('expression', '$pow', (args, context) => {
        const [base, exp] = args.map(arg => expression(arg)(context));
        return Math.pow(base, exp);
    });
    add('filter', '$startswith', (query, value) => value.startsWith(query));
    add('expression', '$mod', (args, context) => args.map(arg => expression(arg)(context)).reduce((a, b) => a % b));

    add('stage', '$customStage1', (args, context) => {
        // Adds a new field `newField` with a static value to each document
        return context.map(item => ({...item, newField: 'addedValue'}))
    });
    
    add('stage', '$customStage2', (args, context) => {
        // Multiplies the `score` field by a constant
        const multiplier = args[0];        
        return context.map(item => ({...item,  score: (item.score * multiplier)}))
    });

    runTests([
        // Test $subtract in aggregate
        {
            title: '$subtract',
            input: () => aggregate([
                { $project: { result: { $subtract: [100, '$score'] } } } // Subtract score from 100
            ])(data),
            expected: [
                { result: 20 },
                { result: 10 },
                { result: 15 }
            ]
        },

        // Test $pow in aggregate
        {
            title: '$pow',
            input: () => aggregate([
                { $project: { result: { $pow: ['$age', 2] } } } // Age squared
            ])(data),
            expected: [
                { result: 625 }, // 25^2
                { result: 900 }, // 30^2
                { result: 1225 } // 35^2
            ]
        },

        // Test $startswith in filter
        {
            title: 'Filter: $startswith',
            input: () => data.filter(filter({ name: { $startswith: 'A' } })),
            expected: [
                { name: 'Alice', age: 25, city: 'New York', score: 80, friends: [{ name: 'Bob', age: 26 }, { name: 'John', age: 34 }] }
            ]
        },

        // Test $mod in expression
        {
            title: '$mod',
            input: () => expression({ $mod: ['$age', 10] })(data[0]),
            expected: 5 // 25 % 10
        },

        // Test combined operations
        {
            title: 'Complex $subtract, $pow, $project',
            input: () => aggregate([
                { $project: { name: 1, ageSquared: { $pow: ['$age', 2] }, scoreDiff: { $subtract: [100, '$score'] } } }, // Project age squared and score difference
                { $match: { scoreDiff: { $gt: 10 } } } // Filter where scoreDiff > 10
            ])(data),
            expected: [
                { name: 'Alice', ageSquared: 625, scoreDiff: 20 },
                { name: 'Charlie', ageSquared: 1225, scoreDiff: 15 }
            ]
        },
        {
            title: 'Stage: $customStage1',
            input: () => aggregate([
                { $customStage1: {} }, // Apply customStage1
                { $project: { name: 1, age: 1, city: 1, score: 1, newField: 1 } }
            ])(data),
            expected: [
                { name: 'Alice', age: 25, city: 'New York', score: 80, newField: 'addedValue' },
                { name: 'Bob', age: 30, city: 'San Francisco', score: 90, newField: 'addedValue' },
                { name: 'Charlie', age: 35, city: 'New York', score: 85, newField: 'addedValue' }
            ]
        },
        {
            title: 'Stage: $customStage2',
            input: () => aggregate([
                { $customStage2: [2] }, // Multiply `score` by 2
                { $project: { name: 1, age: 1, city: 1, score: 1 } }
            ])(data),
            expected: [
                { name: 'Alice', age: 25, city: 'New York', score: 160 },
                { name: 'Bob', age: 30, city: 'San Francisco', score: 180 },
                { name: 'Charlie', age: 35, city: 'New York', score: 170 }
            ]
        },
        {
            title: 'Pipeline: Combined $customStage1 and $customStage2',
            input: () => aggregate([
                { $customStage2: [3] }, // First, multiply `score` by 3
                { $customStage1: [] },  // Then, add `newField`
                { $project: { name: 1, age: 1, city: 1, score: 1, newField: 1 } }
            ])(data),
            expected: [
                { name: 'Alice', age: 25, city: 'New York', score: 240, newField: 'addedValue' },
                { name: 'Bob', age: 30, city: 'San Francisco', score: 270, newField: 'addedValue' },
                { name: 'Charlie', age: 35, city: 'New York', score: 255, newField: 'addedValue' }
            ]
        }

    ]);
});

describe('Complex Aggregate Test', () => {
    const data = [
        { name: 'Alice', age: 25, city: 'New York', score: 80, friends: [{ name: 'Bob', age: 26 }, { name: 'John', age: 34 }] },
        { name: 'Bob', age: 30, city: 'San Francisco', score: 90, friends: [{ name: 'Jane', age: 30 }] },
        { name: 'Charlie', age: 35, city: 'New York', score: 85, friends: [{ name: 'Jack', age: 26 }, { name: 'John', age: 34 }, { name: 'Paul', age: 42 }] }
    ];

    runTests([
        {
            title: 'Complex filter, project, sort, skip, limit, group',
            input: () => aggregate([
                { $match: { city: 'New York' } }, // Filter
                { $project: { name: 1, score: 1, ageGroup: { $cond: [{ $gte: ['$age', 30] }, '30+', 'under 30'] } } }, // Project
                { $sort: { score: -1 } }, // Sort by score descending
                { $skip: 1 }, // Skip first item
                { $limit: 1 }, // Limit to one item
                { $group: { _id: '$ageGroup', avgScore: { $avg: '$score' } } } // Group by ageGroup and calculate avgScore
            ])(data),
            expected: [
                { _id: 'under 30', avgScore: 80 }
            ]
        },
        {
            title: 'Complex multiple stages and expressions',
            input: () => aggregate([
                { $match: { friends: { $elemMatch: { age: { $gte: 30 } } } } }, // Filter by friends' age using $elemMatch
                { $project: { name: 1, totalScore: { $add: ['$score', 10] }, city: 1 } }, // Project with totalScore
                { $sort: { name: 1 } }, // Sort by name ascending
                { $group: { _id: '$city', maxScore: { $max: '$totalScore' } } } // Group by city and get max totalScore
            ])(data),
            expected: [
                { _id: 'New York', maxScore: 95 },
                { _id: 'San Francisco', maxScore: 100 }
            ]
        },
        // Add more complex tests as needed...
    ]);
});

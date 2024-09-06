import { filter, add, eq } from './lite/index.js';
import { expression } from './src/index.js';

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
            const passed = eq(output, testCase.expected);
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

    add('filter', '$mod', (query, value) => (value % query[0]) === query[1]);
    add('filter', '$where', function (query, value) { return query.call(value) })
    add('filter', '$expr', (query, value) => expression(query)(value))

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

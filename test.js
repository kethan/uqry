import { filter, expression, aggregate, add } from './src/index.js';

// Test cases for the filter function
const testFilter = () => {
    const data = [
        { name: 'Alice', age: 25, city: 'New York' },
        { name: 'Bob', age: 30, city: 'San Francisco' },
        { name: 'Charlie', age: 35, city: 'New York' },
    ];

    console.log('Test Filter: $eq');
    console.assert(filter({ age: { $eq: 25 } })(data[0]) === true, 'Test Case 1 Failed');
    console.assert(filter({ age: { $eq: 40 } })(data[0]) === false, 'Test Case 2 Failed');

    console.log('Test Filter: $gt');
    console.assert(filter({ age: { $gt: 25 } })(data[1]) === true, 'Test Case 3 Failed');
    console.assert(filter({ age: { $gt: 40 } })(data[1]) === false, 'Test Case 4 Failed');

    console.log('Test Filter: $and');
    console.assert(filter({ $and: [{ city: 'New York' }, { age: { $gt: 30 } }] })(data[2]) === true, 'Test Case 5 Failed');
    console.assert(filter({ $and: [{ city: 'San Francisco' }, { age: { $lt: 40 } }] })(data[0]) === false, 'Test Case 6 Failed');
};

// Test cases for the expression function
const testExpression = () => {
    const context = { a: 5, b: 10, str: 'Hello World' };

    console.log('Test Expression: $add');
    console.assert(expression({ $add: ['$a', '$b'] })(context) === 15, 'Test Case 7 Failed');

    console.log('Test Expression: $subtract');
    console.assert(expression({ $subtract: ['$b', '$a'] })(context) === 5, 'Test Case 8 Failed');

    console.log('Test Expression: $concat');
    console.assert(expression({ $concat: ['$str', '!!!'] })(context) === 'Hello World!!!', 'Test Case 9 Failed');

    console.log('Test Expression: $ifnull');

    add('$ifnull', ([a, b], context) => expression(a)(context) == null ? expression(b)(context) : expression(a)(context));
    console.assert(expression({ $ifnull: ['$a', 100] })(context) === 5, 'Test Case 10 Failed');
    console.assert(expression({ $ifnull: ['$c', 100] })(context) === 100, 'Test Case 11 Failed');
};

// Test cases for the aggregate function
const testAggregate = () => {
    const data = [
        { name: 'Alice', age: 25, city: 'New York', score: 80 },
        { name: 'Bob', age: 30, city: 'San Francisco', score: 85 },
        { name: 'Charlie', age: 35, city: 'New York', score: 90 },
    ];

    console.log('Test Aggregate: $match');
    const matchPipeline = [{ $match: { city: 'New York' } }];
    const matchResult = aggregate(matchPipeline)(data);
    console.assert(matchResult.length === 2 && matchResult[0].name === 'Alice', 'Test Case 12 Failed');

    console.log('Test Aggregate: $group');
    const groupPipeline = [{ $group: { _id: '$city', totalScore: { $sum: '$score' } } }];
    const groupResult = aggregate(groupPipeline)(data);
    console.assert(groupResult.length === 2 && groupResult[0].totalScore === 170, 'Test Case 13 Failed');

    console.log('Test Aggregate: $sort');
    const sortPipeline = [{ $sort: { age: -1 } }];
    const sortResult = aggregate(sortPipeline)(data);
    console.assert(sortResult[0].name === 'Charlie' && sortResult[2].name === 'Alice', 'Test Case 14 Failed');

    console.log('Test Aggregate: $limit');
    const limitPipeline = [{ $limit: 2 }];
    const limitResult = aggregate(limitPipeline)(data);
    console.assert(limitResult.length === 2, 'Test Case 15 Failed');

    console.log('Test Aggregate: $count');
    const countPipeline = [{ $count: 'total' }];
    const countResult = aggregate(countPipeline)(data);
    console.assert(countResult[0].total === 3, 'Test Case 16 Failed');
};

// Run all tests
const runTests = () => {
    testFilter();
    testExpression();
    testAggregate();
    console.log('All tests completed.');
};

runTests();

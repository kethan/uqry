## UQry

# Aggregation and Filtering

[![tests](https://github.com/kethan/uqry/actions/workflows/node.js.yml/badge.svg)](https://github.com/kethan/uqry/actions/workflows/node.js.yml) [![Version](https://img.shields.io/npm/v/uqry.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uqry) [![Badge size](https://img.badgesize.io/https://unpkg.com/uqry/dist/index.min.js?compression=brotli&label=brotli&style=flat-square)](https://unpkg.com/uqry) [![Badge size](https://img.badgesize.io/https://unpkg.com/uqry/dist/index.min.js?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uqry)

This module provides functionality for filtering and aggregating data based on MongoDB-like query syntax. It includes a set of predefined operations and the ability to extend with custom operators.

## Installation

Install the module using npm:

```sh
npm install uqry
yarn add uqry
```

## Usage

### Importing the Module

```javascript
import { filter, expression, aggregate, add } from "uqry";
```

### Filter Function

The `filter` function creates a filter based on a query object.

#### Syntax

```javascript
const filter = (query) => value;
```

#### Example

```javascript
const query = { age: { $gt: 25 } };
const data = { name: "Alice", age: 30 };

const result = filter(query)(data); // true

const data = [
	{ name: "Alice", age: 25, city: "New York" },
	{ name: "Bob", age: 30, city: "San Francisco" },
	{ name: "Charlie", age: 35, city: "New York" },
];

const filterFunc = filter({ city: "New York", age: { $gt: 30 } });
const result = data.filter(filterFunc);
console.log(result); // [{ name: 'Charlie', age: 35, city: 'New York' }]

// $expr in filter function
console.log([
    { _id: 1, item: "binder", qty: parseInt("100"), price: parseFloat("12") },
    { _id: 2, item: "notebook", qty: parseInt("200"), price: parseFloat("8") },
    { _id: 3, item: "pencil", qty: parseInt("50"), price: parseFloat("6") },
    { _id: 4, item: "eraser", qty: parseInt("150"), price: parseFloat("3") },
    { _id: 5, item: "legal pad", qty: parseInt("42"), price: parseFloat("10") }
].filter(filter({
    $expr: {
        $lt: [
            {
                $cond: [
                    { $gte: ["$qty", 100] },
                    { $multiply: ["$price", parseFloat("0.50")] },
                    { $multiply: ["$price", parseFloat("0.75")] }
                ]
            },
            5
        ]
    }
})));
```

### Nested properties filter

```javascript
const data = [
	{
		name: "Alice",
		age: 30,
		address: {
			city: "New York",
			zip: 10001,
		},
	},
	{
		name: "Bob",
		age: 25,
		address: {
			city: "San Francisco",
			zip: 94105,
		},
	},
	{
		name: "Charlie",
		age: 35,
		address: {
			city: "New York",
			zip: 10002,
		},
	},
];

const filterCriteria = {
	"address.city": { $eq: "New York" },
};

const filteredData = data.filter((item) => filter(filterCriteria)(item));
console.log(filteredData);
/*
[
    {
        name: "Alice",
        age: 30,
        address: {
            city: "New York",
            zip: 10001
        }
    },
    {
        name: "Charlie",
        age: 35,
        address: {
            city: "New York",
            zip: 10002
        }
    }
]
*/

const pipeline = [
	{
		$group: {
			_id: "$address.city",
			avgAge: { $avg: "$age" },
			count: { $sum: 1 },
		},
	},
	{
		$sort: { count: -1 },
	},
];

const aggregatedData = aggregate(pipeline)(data);

console.log(aggregatedData);
/*
[
    {
        _id: "New York",
        avgAge: 32.5,
        count: 2
    },
    {
        _id: "San Francisco",
        avgAge: 25,
        count: 1
    }
]
*/
```

### Expression Function

The `expression` function evaluates an expression based on the provided context.

#### Syntax

```javascript
const expression = (expr) => context;
```

#### Example

```javascript
const expr = { $add: [1, 2, 3] };
const context = {};

const result = expression(expr)(context); // 6

// More expression
const context = { a: 5, b: 10, str: "Hello World" };

console.log(expression({ $add: ["$a", "$b"] })(context)); // 15
console.log(expression({ $subtract: ["$b", "$a"] })(context)); // 5
console.log(expression({ $concat: ["$str", "!!!"] })(context)); // 'Hello World!!!'

// Test data
const data = [
	{ name: "John", age: 18 },
	{ name: "Alice", age: 20 },
	{ name: "John", age: 25 },
	{ name: "Bob", age: 15 },
	{ name: "Charlie", age: 22 },
	{ name: "David", age: 30 },
];
console.log(
	data.filter(
		expression({
			$and: [{ $eq: ["$name", "John"] }, { $gt: ["$age", 18] }],
		})
	)
);
```

### Aggregate Function

The `aggregate` function processes an array of documents through a pipeline of stages.

#### Syntax

```javascript
const aggregate = (pipeline) => contextArray;
```

#### Example

```javascript
const pipeline = [
	{ $match: { age: { $gt: 25 } } },
	{ $group: { _id: "$gender", total: { $sum: 1 } } },
];
const data = [
	{ name: "Alice", age: 30, gender: "female" },
	{ name: "Bob", age: 20, gender: "male" },
	{ name: "Charlie", age: 35, gender: "male" },
];

const result = aggregate(pipeline)(data);
// [
//     { _id: 'female', total: 1 },
//     { _id: 'male', total: 1 }
// ]

const data = [
	{ name: "Alice", age: 30, city: "New York" },
	{ name: "Bob", age: 25, city: "Los Angeles" },
	{ name: "Charlie", age: 35, city: "New York" },
];

const pipeline = [
	{
		$project: {
			name: 1,
			age: { $add: ["$age", 1] }, // Add 1 to age
			city: 1,
		},
	},
	{
		$match: {
			age: { $gt: 30 }, // Filter for age > 30
			city: "New York", // Filter for city "New York"
		},
	},
	{
		$group: {
			_id: "$city", // Group by city
			averageAge: { $avg: "$age" }, // Calculate average age
		},
	},
];

const result = aggregate(pipeline)(data);

console.log(result);

// Switch Case
console.log(
  aggregate([
    {
      $project: {
        statusDescription: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$status", "A"] },
                then: "Available",
              },
              {
                case: { $eq: ["$status", "D"] },
                then: "Discontinued",
              },
            ],
            default: "No status found",
          },
        },
      },
    },
  ])([
    { status: "A" },
    { status: "D" },
    { status: "A" },
    { status: "A" },
    { status: "D" },
    { status: "E" },
  ]),
);

```
---

# `add` Function

## Overview

The `add` function allows you to dynamically add custom operators to the filtering, expression, and pipeline stages of your data processing operations. This feature is useful for extending the functionality of your data manipulation library with custom logic that can be applied to your datasets.

## Function Signature

```javascript
add(which, op, fn)
```

### Parameters

- **`which`**: A string specifying the type of operation to which the custom function should be added. Valid values are:
  - `'filter'`: For adding custom filter operations.
  - `'pipeline'`: For adding custom pipeline stages.
  - `'expression'`: For adding custom expression operations.

- **`op`**: A string representing the name of the custom operation or stage. This will be used to reference the custom operation in your queries or pipelines.

- **`fn`**: A function implementing the custom logic for the operation. The signature of this function depends on the type of operation:
  - **Filter Function**: `(query, value) => boolean`
  - **Pipeline Function**: `(args, context) => result`
  - **Expression Function**: `(args, context) => result`

## Usage

### Adding Custom Filter Operations

To add a custom filter operation, use the `add` function with the `'filter'` parameter.

```javascript
add('filter', '$customOp', (query, value) => {
    // Custom filter logic
});
```

### Adding Custom Pipeline Stages

To add a custom pipeline stage, use the `add` function with the `'pipeline'` parameter.

```javascript
add('pipeline', '$customStage', (args, context) => {
    // Custom pipeline stage logic
});
```

### Adding Custom Aggregation Operations

To add a custom expression operation, use the `add` function with the `'expression'` parameter.

```javascript
add('expression', '$customAgg', (args, context) => {
    // Custom expression logic
});
```

## Examples

### Custom Filter Operation

```javascript
add('filter', '$isEven', (query, value) => value % 2 === 0);

// Usage in filter
const result = data.filter(filter({ age: { $isEven: true } }));
```

### Custom Pipeline Stage

```javascript
add('pipeline', '$addField', (args, context) => {
    return { ...context, newField: 'newValue' };
});

// Usage in pipeline
const result = aggregate([{ $addField: [] }])(data);
```

### Custom expression Operation

```javascript
add('expression', '$sumField', (args, context) => {
    return args.map(arg => expression(arg)(context)).reduce((a, b) => a + b, 0);
});

// Usage in aggregation
const result = aggregate([{ $sumField: ['field'] }])(data);
```

## Notes

- Ensure that the custom functions do not modify the original data or context unless intended.
- Custom functions should handle various edge cases and invalid inputs gracefully.
- Custom filter, pipeline, and expression operations should be tested thoroughly to ensure they behave as expected.

---

## Built-In Filter Operations

-   `$eq`: Equals
-   `$ne`: Not equals
-   `$gt`: Greater than
-   `$gte`: Greater than or equal to
-   `$lt`: Less than
-   `$lte`: Less than or equal to
-   `$in`: In array
-   `$nin`: Not in array
-   `$and`: Logical AND
-   `$or`: Logical OR
-   `$not`: Logical NOT
-   `$regex`: Regexp
-   `$expr`: Expression
-   `$exists`: Element exists
-   `$type`: Type of the value
-   `$mod`: Mod
-	  `$elemMatch`: Array element matches
-	  `$all`: All elements matched in array
-	  `$size`: Size of an array
-	  `$where`: Custom function

## Built-In Aggregation Operations

-   `$add`: Addition
-   `$subtract`: Subtraction
-   `$multiply`: Multiplication
-   `$divide`: Division
-   `$concat`: Concatenation
-   `$min`: Minimum value
-   `$max`: Maximum value
-   `$avg`: Average
-   `$sum`: Sum
-   `$cond`: Conditional
-   `$switch`: Switch Case
-   `$eq`: Equals
-   `$ne`: Not equals
-   `$gt`: Greater than
-   `$gte`: Greater than or equal to
-   `$lt`: Less than
-   `$lte`: Less than or equal to
-   `$in`: In array
-   `$nin`: Not in array
-   `$and`: Logical AND
-   `$or`: Logical OR
-   `$not`: Logical NOT

## Built-In Pipeline Operations

-   `$project`: Reshapes documents
-   `$match`: Filters documents
-   `$group`: Groups documents
-   `$sort`: Sorts documents
-   `$skip`: Skips documents
-   `$limit`: Limits documents
-   `$count`: Counts documents

## License

This project is licensed under the MIT License.

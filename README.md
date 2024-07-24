## UQry

# Aggregation and Filtering


[![Version](https://img.shields.io/npm/v/uqry.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uqry) [![Badge size](https://img.badgesize.io/https://unpkg.com/uqry?compression=brotli&label=brotli&style=flat-square)](https://unpkg.com/uqry) [![Badge size](https://img.badgesize.io/https://unpkg.com/uqry?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uqry)

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

const result = aggregate(pipeline)(d);

console.log(result);
```

### Adding Custom Aggregation Operators

You can add custom aggregation operators using the `add` function.

#### Syntax

```javascript
const add = (op, fn);
```

#### Example

```javascript
const customOperator = ([a, b], context) =>
	expression(a)(context) % expression(b)(context);

add("$mod", customOperator);

const context = { a: 10, b: 3 };
console.log(expression({ $mod: ["$a", "$b"] })(context)); // 1

add("$toLower", (args, context) => expression(args[0])(context).toLowerCase());
add("$toUpper", (args, context) => expression(args[0])(context).toUpperCase());
add("$substr", (args, context) => {
	const str = expression(args[0])(context);
	const start = Math.max(0, expression(args[1])(context) - 1);
	const length = expression(args[2])(context);
	return str.slice(start, start + length);
});
```

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

```

This `README.md` provides a comprehensive guide for using the module, including examples of how to use the filter, expression, and aggregate functions, as well as instructions for adding custom aggregation operators.
```

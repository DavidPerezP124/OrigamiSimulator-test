/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { epsilonEqual } from '../math/compare.js';

const uniqueElements = (array) => Array.from(new Set(array));
const nonUniqueElements = (array) => {
	const count = {};
	array.forEach(el => {
		if (count[el] === undefined) { count[el] = 0; }
		count[el] += 1;
	});
	return array.filter(el => count[el] > 1);
};
const uniqueSortedNumbers = (array) => {
	const hash = {};
	array.forEach(n => { hash[n] = true; });
	return Object.keys(hash).map(parseFloat);
};
const epsilonUniqueSortedNumbers = (array, epsilon = EPSILON) => {
	const numbers = array.slice().sort((a, b) => a - b);
	if (numbers.length < 2) { return numbers; }
	const keep = [true];
	for (let i = 1; i < numbers.length; i += 1) {
		keep[i] = !epsilonEqual(numbers[i], numbers[i - 1], epsilon);
	}
	return numbers.filter((_, i) => keep[i]);
};
const arrayIntersection = (array1, array2) => {
	const hash = {};
	array2.forEach(value => { hash[value] = 0; });
	array2.forEach(value => { hash[value] += 1; });
	return array1.filter(value => {
		if (hash[value] > 0) {
			hash[value] -= 1;
			return true;
		}
		return false;
	});
};
const rotateCircularArray = (array, newStartIndex) => (
	newStartIndex <= 0
		? array
		: array
			.slice(newStartIndex)
			.concat(array.slice(0, newStartIndex)));
const splitCircularArray = (array, indices) => {
	indices.sort((a, b) => a - b);
	return [
		array.slice(indices[1]).concat(array.slice(0, indices[0] + 1)),
		array.slice(indices[0], indices[1] + 1),
	];
};
const chooseTwoPairs = (array) => {
	const pairs = Array((array.length * (array.length - 1)) / 2);
	let index = 0;
	for (let i = 0; i < array.length - 1; i += 1) {
		for (let j = i + 1; j < array.length; j += 1, index += 1) {
			pairs[index] = [array[i], array[j]];
		}
	}
	return pairs;
};
const setDifferenceSortedNumbers = (a, b) => {
	const result = [];
	let ai = 0;
	let bi = 0;
	while (ai < a.length && bi < b.length) {
		if (a[ai] === b[bi]) {
			ai += 1;
		} else if (a[ai] > b[bi]) {
			bi += 1;
		} else if (b[bi] > a[ai]) {
			result.push(a[ai]);
			ai += 1;
		}
	}
	return result;
};
const setDifferenceSortedEpsilonNumbers = (a, b, epsilon = EPSILON) => {
	const result = [];
	let ai = 0;
	let bi = 0;
	while (ai < a.length && bi < b.length) {
		if (epsilonEqual(a[ai], b[bi], epsilon)) {
			ai += 1;
		} else if (a[ai] > b[bi]) {
			bi += 1;
		} else if (b[bi] > a[ai]) {
			result.push(a[ai]);
			ai += 1;
		}
	}
	return result;
};
const arrayMinimumIndex = (array, map) => {
	if (!array.length) { return undefined; }
	const arrayValues = typeof map === "function"
		? array.map(value => map(value))
		: array;
	let index = 0;
	arrayValues.forEach((value, i, arr) => {
		if (value < arr[index]) { index = i; }
	});
	return index;
};
const arrayMaximumIndex = (array, map) => {
	if (!array.length) { return undefined; }
	const arrayValues = typeof map === "function"
		? array.map(value => map(value))
		: array;
	let index = 0;
	arrayValues.forEach((value, i, arr) => {
		if (value > arr[index]) { index = i; }
	});
	return index;
};
const mergeArraysWithHoles = (...arrays) => {
	const flattened = [];
	arrays.forEach(array => array.forEach((value, i) => {
		flattened[i] = value;
	}));
	return flattened;
};
const clustersToReflexiveArrays = (clusters) => {
	const result = [];
	clusters.flat().forEach(i => { result[i] = []; });
	clusters
		.flatMap(chooseTwoPairs)
		.forEach(([a, b]) => {
			result[a].push(b);
			result[b].push(a);
		});
	return result;
};
const arrayArrayToLookupArray = (array_array) => array_array
	.map(array => {
		const lookup = [];
		array.forEach(i => { lookup[i] = true; });
		return lookup;
	});
const lookupArrayToArrayArray = (lookupArray) => lookupArray
	.map(array => array
		.map((overlap, i) => (overlap ? i : undefined))
		.filter(a => a !== undefined));

export { arrayArrayToLookupArray, arrayIntersection, arrayMaximumIndex, arrayMinimumIndex, chooseTwoPairs, clustersToReflexiveArrays, epsilonUniqueSortedNumbers, lookupArrayToArrayArray, mergeArraysWithHoles, nonUniqueElements, rotateCircularArray, setDifferenceSortedEpsilonNumbers, setDifferenceSortedNumbers, splitCircularArray, uniqueElements, uniqueSortedNumbers };

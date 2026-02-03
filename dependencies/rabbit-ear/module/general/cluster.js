/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { normalize, parallelNormalized } from '../math/vector.js';
import { doRangesOverlap, rangeUnion } from '../math/range.js';

const clusterSortedGeneric = (elements, comparison) => {
	if (!elements.length) { return []; }
	const indices = elements.map((_, i) => i);
	const groups = [[indices.shift()]];
	indices.forEach((index) => {
		const group = groups[groups.length - 1];
		const prevElement = group[group.length - 1];
		if (comparison(elements[prevElement], elements[index])) {
			group.push(index);
		} else {
			groups.push([index]);
		}
	});
	return groups;
};
const clusterUnsortedIndices = (indices, comparison) => {
	if (!indices.length) { return []; }
	const indicesCopy = indices.slice();
	const groups = [[indicesCopy.shift()]];
	indicesCopy.forEach((index) => {
		const matchFound = groups
			.map((group, g) => (comparison(group[0], index) ? g : undefined))
			.filter(a => a !== undefined)
			.shift();
		if (matchFound !== undefined) {
			groups[matchFound].push(index);
		} else {
			groups.push([index]);
		}
	});
	return groups;
};
const clusterScalars = (numbers, epsilon = EPSILON) => {
	const indices = numbers
		.map((v, i) => ({ v, i }))
		.sort((a, b) => a.v - b.v)
		.map(el => el.i)
		.filter(() => true);
	const sortedNumbers = indices.map(i => numbers[i]);
	const compFn = (a, b) => Math.abs(a - b) < epsilon;
	return clusterSortedGeneric(sortedNumbers, compFn)
		.map(arr => arr.map(i => indices[i]));
};
const clusterRanges = (ranges, epsilon = EPSILON) => {
	const indices = ranges
		.map(([a, b], i) => ({ v: Math.min(a, b), i }))
		.sort((a, b) => a.v - b.v)
		.map(el => el.i)
		.filter(() => true);
	const sortedRanges = indices.map(i => ranges[i]);
	let currentRange = [...sortedRanges[0]];
	const comparison = (_, b) => {
		const overlap = doRangesOverlap(currentRange, b, epsilon);
		currentRange = overlap ? rangeUnion(currentRange, b) : [...b];
		return overlap;
	};
	return clusterSortedGeneric(sortedRanges, comparison)
		.map(arr => arr.map(i => indices[i]));
};
const clusterParallelVectors = (vectors, epsilon = EPSILON) => {
	const normalized = vectors.map(normalize);
	const groups = [[0]];
	loop1: for (let i = 1; i < normalized.length; i += 1) {
		for (let g = 0; g < groups.length; g += 1) {
			if (parallelNormalized(normalized[i], normalized[groups[g][0]], epsilon)) {
				groups[g].push(i);
				continue loop1;
			}
		}
		groups.push([i]);
	}
	return groups;
};

export { clusterParallelVectors, clusterRanges, clusterScalars, clusterSortedGeneric, clusterUnsortedIndices };

/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { getAllPrefixes, getAllSuffixes, filterKeysWithPrefix, filterKeysWithSuffix } from '../../fold/spec.js';

const intersectionOfStrings = (array1, array2) => {
	const counts = {};
	array1.forEach(key => { counts[key] = 1; });
	array2.forEach(key => {
		counts[key] = counts[key] === 1 ? 2 : 1;
	});
	return Object.keys(counts).filter(key => counts[key] === 2);
};
const arraysHaveSameIndices = (arrays = []) => {
	if (arrays.length < 2) { return []; }
	const indices = {};
	arrays[0].forEach((_, i) => { indices[i] = true; });
	return Array.from(Array(arrays.length - 1))
		.map((_, i) => arrays[i + 1])
		.flatMap((arr, p) => arr
			.map((_, i) => (indices[i] ? undefined : [0, p + 1, i]))
			.filter(a => a !== undefined));
};
const validateReferences = (graph) => {
	const allPrefixes = getAllPrefixes(graph)
		.filter(key => key !== "file" && key !== "frame");
	const allSuffixes = getAllSuffixes(graph);
	const prefixKeys = allPrefixes
		.map(prefix => filterKeysWithPrefix(graph, prefix));
	const prefixTestErrors = prefixKeys
		.map(keys => keys
			.map(key => graph[key])
			.filter(arr => arr.constructor === Array))
		.map(arraysHaveSameIndices)
		.flatMap((prefixErrors, p) => prefixErrors
			.map(err => [prefixKeys[p][err[0]], prefixKeys[p][err[1]], err[2]]))
		.map(([a, b, i]) => `array indices differ ${a}, ${b} at index ${i}`);
	let referenceErrors = [];
	try {
		referenceErrors = intersectionOfStrings(allPrefixes, allSuffixes)
			.flatMap(match => {
				const prefixArrayKeys = prefixKeys[allPrefixes.indexOf(match)];
				const prefixArray = graph[prefixArrayKeys[0]];
				return filterKeysWithSuffix(graph, match)
					.flatMap(key => graph[key]
						.flatMap((arr, i) => arr
							.map((index, j) => (index === null
								|| index === undefined
								|| prefixArray[index] !== undefined
								? undefined
								: `${key}[${i}][${j}] references ${match} ${index}, missing in ${prefixArrayKeys[0]}`))
							.filter(a => a !== undefined)));
			});
	} catch (error) {
		referenceErrors.push("reference validation failed due to bad index access");
	}
	return prefixTestErrors.concat(referenceErrors);
};

export { validateReferences };

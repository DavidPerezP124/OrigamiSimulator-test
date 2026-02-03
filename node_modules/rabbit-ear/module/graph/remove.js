/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { count } from './count.js';
import { uniqueSortedNumbers } from '../general/array.js';
import { remapKey } from './maps.js';

const makeIndexMap = (graph, key, removeIndices) => {
	const sortedIndices = uniqueSortedNumbers(removeIndices);
	const arrayLength = count(graph, key);
	const indexMap = [];
	for (let i = 0, j = 0, walk = 0; i < arrayLength; i += 1, j += 1) {
		while (i === sortedIndices[walk]) {
			indexMap[i] = undefined;
			i += 1;
			walk += 1;
		}
		if (i < arrayLength) { indexMap[i] = j; }
	}
	return indexMap;
};
const remove = (graph, key, removeIndices) => {
	const indexMap = makeIndexMap(graph, key, removeIndices);
	remapKey(graph, key, indexMap);
	return indexMap;
};

export { remove };

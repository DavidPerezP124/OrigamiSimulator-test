/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { uniqueSortedNumbers } from '../general/array.js';
import Messages from '../environment/messages.js';
import { count } from './count.js';
import { remapKey } from './maps.js';

const makeIndexMap = (graph, key, replaceIndices, replaces) => {
	const arrayLength = count(graph, key);
	const indexMap = [];
	for (let i = 0, j = 0, walk = 0; i < arrayLength; i += 1, j += 1) {
		while (i === replaces[walk]) {
			indexMap[i] = indexMap[replaceIndices[replaces[walk]]];
			if (indexMap[i] === undefined) {
				throw new Error(Messages.replaceUndefined);
			}
			i += 1;
			walk += 1;
		}
		if (i < arrayLength) { indexMap[i] = j; }
	}
	return indexMap;
};
const replace = (graph, key, replaceIndices) => {
	Object.entries(replaceIndices)
		.map(([index, value]) => [parseInt(index, 10), value])
		.filter(([index, value]) => index < value)
		.forEach(([index, value]) => {
			delete replaceIndices[index];
			replaceIndices[value] = index;
		});
	const removes = Object.keys(replaceIndices).map(n => parseInt(n, 10));
	const replaces = uniqueSortedNumbers(removes);
	const indexMap = makeIndexMap(graph, key, replaceIndices, replaces);
	remapKey(graph, key, indexMap);
	return indexMap;
};

export { replace };

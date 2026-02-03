/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { filterKeysWithSuffix, filterKeysWithPrefix } from '../fold/spec.js';

const invertFlatMap = (map) => {
	const inv = [];
	map.forEach((n, i) => { inv[n] = i; });
	return inv;
};
const invertArrayToFlatMap = (map) => {
	const inv = [];
	map.forEach((arr, i) => arr.forEach(n => { inv[n] = i; }));
	return inv;
};
const invertFlatToArrayMap = (map) => {
	const inv = [];
	map.forEach((n, i) => {
		if (inv[n] === undefined) { inv[n] = []; }
		inv[n].push(i);
	});
	return inv;
};
const invertArrayMap = (map) => {
	const inv = [];
	map.forEach((arr, i) => arr.forEach(m => {
		if (inv[m] === undefined) { inv[m] = []; }
		inv[m].push(i);
	}));
	return inv;
};
const mergeFlatNextmaps = (...maps) => {
	if (maps.length === 0) { return []; }
	const solution = maps[0].map((_, i) => i);
	maps.forEach(map => solution.forEach((s, i) => { solution[i] = map[s]; }));
	return solution;
};
const mergeNextmaps = (...maps) => {
	if (maps.length === 0) { return []; }
	const solution = maps[0].map((_, i) => [i]);
	maps.forEach(map => {
		solution.forEach((s, i) => s
			.forEach((indx, j) => { solution[i][j] = map[indx]; }));
		solution.forEach((arr, i) => {
			solution[i] = arr.flat()
				.filter(a => a !== undefined);
		});
	});
	return solution;
};
const mergeFlatBackmaps = (...maps) => {
	if (maps.length === 0) { return []; }
	let solution = maps[0].map((_, i) => i);
	maps.forEach(map => {
		const next = map.map(n => solution[n]);
		solution = next;
	});
	return solution;
};
const mergeBackmaps = (...maps) => {
	if (maps.length === 0) { return []; }
	let solution = maps[0].flat().map((_, i) => [i]);
	maps.forEach(map => {
		const next = [];
		map.forEach((el, j) => {
			if (typeof el === "number") {
				next[j] = solution[el];
			} else {
				next[j] = el.map(n => solution[n]).reduce((a, b) => a.concat(b), []);
			}
		});
		solution = next;
	});
	return solution;
};
const remapKey = (graph, key, indexMap) => {
	const invertedMap = [];
	indexMap.forEach((n, i) => {
		invertedMap[n] = (invertedMap[n] === undefined ? i : invertedMap[n]);
	});
	filterKeysWithSuffix(graph, key)
		.forEach(sKey => graph[sKey]
			.forEach((_, ii) => graph[sKey][ii]
				.forEach((v, jj) => { graph[sKey][ii][jj] = indexMap[v]; })));
	filterKeysWithPrefix(graph, key).forEach(prefix => {
		graph[prefix] = invertedMap.map(old => graph[prefix][old]);
	});
	if (key === "faces" && graph.faceOrders) {
		graph.faceOrders = graph.faceOrders
			.map(([a, b, order]) => [indexMap[a], indexMap[b], order]);
	}
	if (key === "edges" && graph.edgeOrders) {
		graph.edgeOrders = graph.edgeOrders
			.map(([a, b, order]) => [indexMap[a], indexMap[b], order]);
	}
};

export { invertArrayMap, invertArrayToFlatMap, invertFlatMap, invertFlatToArrayMap, mergeBackmaps, mergeFlatBackmaps, mergeFlatNextmaps, mergeNextmaps, remapKey };

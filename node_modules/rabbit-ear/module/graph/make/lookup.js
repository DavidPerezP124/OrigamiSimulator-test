/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makePairsMap = (array, subsetIndices) => {
	const map = {};
	const indices = !subsetIndices
		? array.map((_, i) => i)
		: subsetIndices;
	indices
		.forEach(i => array[i]
			.map((_, j, arr) => [0, 1]
				.map(offset => (j + offset) % arr.length)
				.map(n => arr[n])
				.join(" "))
			.forEach(key => { map[key] = i; }));
	return map;
};
const makeVerticesToEdge = ({ edges_vertices }, edges) => (
	makePairsMap(edges_vertices, edges)
);
const makeVerticesToFace = ({ faces_vertices }, faces) => (
	makePairsMap(faces_vertices, faces)
);
const makeEdgesToFace = ({ faces_edges }, faces) => (
	makePairsMap(faces_edges, faces)
);

export { makeEdgesToFace, makeVerticesToEdge, makeVerticesToFace };

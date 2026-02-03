/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makeEdgesVerticesFromFaces = ({ faces_vertices }) => {
	const hash = {};
	const edges_vertices = [];
	faces_vertices
		.map(vertices => vertices
			.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
			.forEach(([a, b]) => {
				if (hash[`${a} ${b}`] || hash[`${b} ${a}`]) { return; }
				hash[`${a} ${b}`] = true;
				edges_vertices.push([a, b]);
			}));
	return edges_vertices;
};

export { makeEdgesVerticesFromFaces };

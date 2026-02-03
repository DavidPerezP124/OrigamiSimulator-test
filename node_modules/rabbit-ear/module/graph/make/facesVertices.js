/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makeFacesVerticesFromEdges = ({ edges_vertices, faces_edges }) => faces_edges
	.map(edges => edges
		.map(edge => edges_vertices[edge])
		.map((pairs, i, arr) => {
			const next = arr[(i + 1) % arr.length];
			return (pairs[0] === next[0] || pairs[0] === next[1])
				? pairs[1]
				: pairs[0];
		}));

export { makeFacesVerticesFromEdges };

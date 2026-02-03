/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makeEdgesEdges = ({ edges_vertices, vertices_edges }) => (
	edges_vertices.map((verts, i) => {
		const side0 = vertices_edges[verts[0]].filter(e => e !== i);
		const side1 = vertices_edges[verts[1]].filter(e => e !== i);
		return side0.concat(side1);
	}));

export { makeEdgesEdges };

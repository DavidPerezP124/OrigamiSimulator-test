/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const walkSingleFace = (
	{ vertices_vertices, vertices_sectors },
	vertex0,
	vertex1,
	walkedEdges = {},
) => {
	const thisWalkedEdges = {};
	let prevVertex = vertex0;
	let currVertex = vertex1;
	const face = {
		vertices: [vertex0],
		edges: [`${vertex0} ${vertex1}`],
		angles: [],
	};
	while (true) {
		const v_v = vertices_vertices[currVertex];
		const fromIndex = v_v.indexOf(prevVertex);
		const nextIndex = (fromIndex + v_v.length - 1) % v_v.length;
		const nextVertex = v_v[nextIndex];
		const nextEdgeVertices = `${currVertex} ${nextVertex}`;
		if (walkedEdges[nextEdgeVertices]) { return undefined; }
		if (thisWalkedEdges[nextEdgeVertices]) {
			Object.assign(walkedEdges, thisWalkedEdges);
			face.vertices.pop();
			face.edges.pop();
			if (!face.angles.length) { delete face.angles; }
			return face;
		}
		thisWalkedEdges[nextEdgeVertices] = true;
		face.vertices.push(currVertex);
		face.edges.push(nextEdgeVertices);
		if (vertices_sectors) {
			face.angles.push(vertices_sectors[currVertex][nextIndex]);
		}
		prevVertex = currVertex;
		currVertex = nextVertex;
	}
};
const walkPlanarFaces = ({ vertices_vertices, vertices_sectors }) => {
	const walkedEdges = {};
	const graph = { vertices_vertices, vertices_sectors };
	return vertices_vertices
		.flatMap((adj_verts, v) => adj_verts
			.map(adj_vert => walkSingleFace(graph, v, adj_vert, walkedEdges))
			.filter(a => a !== undefined));
};
const filterWalkedBoundaryFace = (walkedFaces) => walkedFaces
	.filter(face => face.angles
		.map(a => Math.PI - a)
		.reduce((a, b) => a + b, 0) > 0);

export { filterWalkedBoundaryFace, walkPlanarFaces, walkSingleFace };

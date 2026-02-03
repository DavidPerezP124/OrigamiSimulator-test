/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const addEdge = (
	graph,
	vertices,
	faces = [],
	assignment = "U",
	foldAngle = 0,
) => {
	if (!graph.edges_vertices) { graph.edges_vertices = []; }
	const edge = graph.edges_vertices.length;
	graph.edges_vertices[edge] = vertices;
	if (graph.edges_faces) { graph.edges_faces[edge] = faces; }
	if (graph.edges_assignment) { graph.edges_assignment[edge] = assignment; }
	if (graph.edges_foldAngle) { graph.edges_foldAngle[edge] = foldAngle; }
	return edge;
};
const addIsolatedEdge = (
	graph,
	vertices,
	assignment = "U",
	foldAngle = 0,
) => {
	const edge = addEdge(graph, vertices, [], assignment, foldAngle);
	if (graph.vertices_vertices) {
		vertices
			.filter(vertex => !graph.vertices_vertices[vertex])
			.forEach(vertex => { graph.vertices_vertices[vertex] = []; });
		const otherVertices = [vertices[1], vertices[0]];
		vertices.forEach((vertex, i) => {
			graph.vertices_vertices[vertex].push(otherVertices[i]);
		});
	}
	if (graph.vertices_edges) {
		vertices
			.filter(vertex => !graph.vertices_edges[vertex])
			.forEach(vertex => { graph.vertices_edges[vertex] = []; });
		vertices.forEach((vertex) => { graph.vertices_edges[vertex].push(edge); });
	}
	if (graph.vertices_faces) {
		vertices
			.filter(vertex => !graph.vertices_faces[vertex])
			.forEach(vertex => { graph.vertices_faces[vertex] = []; });
	}
	return edge;
};

export { addEdge, addIsolatedEdge };

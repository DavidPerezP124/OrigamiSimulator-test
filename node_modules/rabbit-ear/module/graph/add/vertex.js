/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const addVertex = (
	graph,
	coords,
	vertices = [],
	edges = [],
	faces = [],
) => {
	if (!graph.vertices_coords) { graph.vertices_coords = []; }
	const vertex = graph.vertices_coords.length;
	graph.vertices_coords[vertex] = coords;
	if (graph.vertices_vertices) { graph.vertices_vertices[vertex] = vertices; }
	if (graph.vertices_edges) { graph.vertices_edges[vertex] = edges; }
	if (graph.vertices_faces) { graph.vertices_faces[vertex] = faces; }
	return vertex;
};
const addVertices = (graph, points = []) => {
	if (!graph.vertices_coords) { graph.vertices_coords = []; }
	const vertices = points.map((_, i) => graph.vertices_coords.length + i);
	vertices.forEach((vertex, i) => {
		graph.vertices_coords[vertex] = points[i];
		if (graph.vertices_vertices) { graph.vertices_vertices[vertex] = []; }
		if (graph.vertices_edges) { graph.vertices_edges[vertex] = []; }
		if (graph.vertices_faces) { graph.vertices_faces[vertex] = []; }
	});
	return vertices;
};

export { addVertex, addVertices };

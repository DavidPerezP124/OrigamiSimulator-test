/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { isVertexCollinear } from '../vertices/collinear.js';
import { removeDuplicateEdges } from '../edges/duplicate.js';
import { mergeNextmaps } from '../maps.js';
import { remove } from '../remove.js';
import { makeVerticesEdgesUnsorted } from '../make/verticesEdges.js';

const removeCollinearVertex = ({ edges_vertices, vertices_edges }, vertex) => {
	const edges = vertices_edges[vertex].sort((a, b) => a - b);
	const [v0, v1] = edges
		.flatMap(e => edges_vertices[e])
		.filter(v => v !== vertex);
	edges_vertices[edges[0]] = [v0, v1];
	edges_vertices[edges[1]] = undefined;
	[v0, v1].forEach(v => {
		const oldEdgeIndex = vertices_edges[v].indexOf(edges[1]);
		if (oldEdgeIndex === -1) { return; }
		vertices_edges[v][oldEdgeIndex] = edges[0];
	});
	return edges[1];
};
const planarizeCollinearVertices = (
	graph,
	epsilon = EPSILON,
) => {
	if (!graph.vertices_edges) {
		graph.vertices_edges = makeVerticesEdgesUnsorted(graph);
	}
	const collinearVertices = graph.vertices_edges
		.map((edges, i) => (edges.length === 2 ? i : undefined))
		.filter(a => a !== undefined)
		.filter(v => isVertexCollinear(graph, v, epsilon))
		.reverse();
	const edgesToRemove = collinearVertices
		.map(v => removeCollinearVertex(graph, v));
	delete graph.vertices_edges;
	const edgesMapCollinear = remove(graph, "edges", edgesToRemove);
	const verticesMap = remove(graph, "vertices", collinearVertices);
	const { map: edgesMapDuplicates } = removeDuplicateEdges(graph);
	const edgesMap = mergeNextmaps(edgesMapCollinear, edgesMapDuplicates);
	return {
		result: graph,
		changes: {
			vertices: { map: verticesMap },
			edges: { map: edgesMap },
		},
	}
};

export { planarizeCollinearVertices };

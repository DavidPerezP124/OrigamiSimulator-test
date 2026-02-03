/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { makeVerticesEdgesUnsorted, makeVerticesEdges } from '../make/verticesEdges.js';
import { makeVerticesVertices } from '../make/verticesVertices.js';
import { makeVerticesFaces } from '../make/verticesFaces.js';
import { replace } from '../replace.js';
import { invertArrayToFlatMap } from '../maps.js';
import { clusterUnsortedIndices } from '../../general/cluster.js';
import { getVerticesClusters } from '../vertices/clusters.js';
import { sweepEdges } from '../sweep.js';

const duplicateEdges = ({ edges_vertices }) => {
	if (!edges_vertices) { return []; }
	const hash = {};
	const duplicates = [];
	edges_vertices
		.map(verts => (verts[0] < verts[1] ? verts : verts.slice().reverse()))
		.map(pair => pair.join(" "))
		.forEach((key, e) => {
			if (hash[key] !== undefined) {
				duplicates[e] = hash[key];
			} else {
				hash[key] = e;
			}
		});
	return duplicates;
};
const getSimilarEdges = (
	{ vertices_coords, vertices_edges, edges_vertices },
	epsilon = EPSILON,
) => {
	const clusters_vertices = getVerticesClusters({ vertices_coords }, epsilon);
	const vertices_cluster = invertArrayToFlatMap(clusters_vertices);
	const comparison = (a, b) => {
		const [a0, a1] = edges_vertices[a].map(v => vertices_cluster[v]);
		const [b0, b1] = edges_vertices[b].map(v => vertices_cluster[v]);
		return (a0 === b0 && a1 === b1) || (a0 === b1 && a1 === b0);
	};
	const edgeSweep = sweepEdges({
		vertices_coords, vertices_edges, edges_vertices,
	});
	return edgeSweep
		.map(({ start }) => start)
		.flatMap(edges => clusterUnsortedIndices(edges, comparison));
};
const removeDuplicateEdges = (graph, replace_indices) => {
	if (!replace_indices) {
		replace_indices = duplicateEdges(graph);
	}
	const removeObject = Object.keys(replace_indices).map(n => parseInt(n, 10));
	const map = replace(graph, "edges", replace_indices);
	if (removeObject.length) {
		if (graph.vertices_edges || graph.vertices_vertices || graph.vertices_faces) {
			graph.vertices_edges = makeVerticesEdgesUnsorted(graph);
			graph.vertices_vertices = makeVerticesVertices(graph);
			graph.vertices_edges = makeVerticesEdges(graph);
			graph.vertices_faces = makeVerticesFaces(graph);
		}
	}
	return { map, remove: removeObject };
};

export { duplicateEdges, getSimilarEdges, removeDuplicateEdges };

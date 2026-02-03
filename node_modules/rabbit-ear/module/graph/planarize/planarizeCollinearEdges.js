/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { epsilonEqual } from '../../math/compare.js';
import { dot2, subtract2, resize2 } from '../../math/vector.js';
import { uniqueElements } from '../../general/array.js';
import { clusterSortedGeneric } from '../../general/cluster.js';
import { invertFlatToArrayMap, invertArrayMap, invertArrayToFlatMap } from '../maps.js';
import { getEdgesLine } from '../edges/lines.js';
import { makeVerticesEdgesUnsorted } from '../make/verticesEdges.js';

const lineVertexClustersToNewVertices = (lines_verticesClusters) => {
	const nextMap = [];
	let newIndex = 0;
	lines_verticesClusters
		.map(clusters => clusters
			.map(verticesCluster => {
				const match = verticesCluster.map(v => nextMap[v]).shift();
				const matchFound = match !== undefined;
				const index = matchFound ? match : newIndex;
				verticesCluster.forEach(v => { nextMap[v] = index; });
				return matchFound ? match : newIndex++;
			}));
	const backMap = invertFlatToArrayMap(nextMap).filter(a => a);
	return invertArrayToFlatMap(backMap);
};
const lineEdgeClustersToNewEdges = (lines_edgesClusters) => {
	const map = [];
	let newIndex = 0;
	lines_edgesClusters
		.map(clusters => clusters
			.map(cluster => {
				cluster
					.filter(i => map[i] === undefined)
					.forEach(i => { map[i] = []; });
				cluster.forEach(i => map[i].push(newIndex));
				return cluster.length ? newIndex++ : newIndex;
			}));
	return map;
};
const assignmentPriority = { B: 1, C: 2, V: 3, M: 4, J: 5, F: 6, U: 7 };
Object.keys(assignmentPriority).forEach(key => {
	assignmentPriority[key.toLowerCase()] = assignmentPriority[key];
});
const highestPriorityAssignmentIndex = (assignments) => {
	if (assignments.length === 1) { return 0; }
	let index = 0;
	assignments.forEach((a, i) => {
		if (assignmentPriority[a] < assignmentPriority[assignments[index]]) {
			index = i;
		}
	});
	return index;
};
const planarizeCollinearEdges = ({
	vertices_coords,
	edges_vertices,
	edges_assignment,
	edges_foldAngle,
}, epsilon = EPSILON) => {
	const {
		lines,
		edges_line,
	} = getEdgesLine({ vertices_coords, edges_vertices }, epsilon);
	const vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	const lines_edges = invertFlatToArrayMap(edges_line);
	const lines_verticesInfo = lines_edges
		.map(edges => uniqueElements(edges.flatMap(edge => edges_vertices[edge])))
		.map((vertices, l) => vertices
			.map(v => ({
				v,
				p: dot2(subtract2(vertices_coords[v], lines[l].origin), lines[l].vector),
			})).sort((a, b) => a.p - b.p));
	const lines_vertices = lines_verticesInfo
		.map(objs => objs.map(({ v }) => v));
	const lines_verticesParameter = lines_verticesInfo
		.map(objs => objs.map(({ p }) => p));
	const lines_verticesClusters = lines_verticesParameter
		.map((params, l) => clusterSortedGeneric(params, epsilonEqual)
			.map(cluster => cluster.map(i => lines_vertices[l][i])));
	const vertexNextMap = lineVertexClustersToNewVertices(lines_verticesClusters);
	const vertexBackMap = invertFlatToArrayMap(vertexNextMap);
	const lines_edgesClusters = lines_verticesClusters
		.map((verticesClusters, l) => {
			const edgesLookup = {};
			lines_edges[l].forEach(e => { edgesLookup[e] = true; });
			const edges = new Set();
			return Array
				.from(Array(verticesClusters.length - 1))
				.map((_, i) => verticesClusters[i])
				.map(vertices => {
					const adjacentEdges = uniqueElements(vertices
						.flatMap(vertex => vertices_edges[vertex])
						.filter(edge => edgesLookup[edge]));
					const adjacentEdgesIsNew = adjacentEdges.map(e => !edges.has(e));
					adjacentEdges.forEach((edge, i) => (adjacentEdgesIsNew[i]
						? edges.add(edge)
						: edges.delete(edge)));
					return Array.from(edges);
				});
		});
	const newEdgesVertices = lines_verticesClusters
		.map(clusters => clusters.map(cluster => vertexNextMap[cluster[0]]))
		.flatMap((vertices, i) => Array
			.from(Array(vertices.length - 1))
			.map((_, j) => (lines_edgesClusters[i][j].length
				? [vertices[j], vertices[j + 1]]
				: undefined)))
		.filter(a => a !== undefined)
		.map(([a, b]) => [a, b]);
	const edgesNextMap = lineEdgeClustersToNewEdges(lines_edgesClusters);
	const newVerticesCoords = vertexBackMap
		.map(vertices => vertices_coords[vertices[0]])
		.map(resize2);
	const result = {
		vertices_coords: newVerticesCoords,
		edges_vertices: newEdgesVertices,
	};
	if (edges_assignment || edges_foldAngle) {
		const edgesBackMap = invertArrayMap(edgesNextMap);
		const edgesBackMapIndexToUse = edges_assignment
			? edgesBackMap
				.map(edges => edges.map(edge => edges_assignment[edge]))
				.map(highestPriorityAssignmentIndex)
			: edgesBackMap.map(() => 0);
		if (edges_assignment) {
			result.edges_assignment = edgesBackMapIndexToUse
				.map((index, i) => edges_assignment[edgesBackMap[i][index]]);
		}
		if (edges_foldAngle) {
			result.edges_foldAngle = edgesBackMapIndexToUse
				.map((index, i) => edges_foldAngle[edgesBackMap[i][index]]);
		}
	}
	const changes = {
		vertices: { map: vertexNextMap },
		edges: { map: edgesNextMap },
		edges_line,
		lines,
	};
	return { result, changes };
};

export { planarizeCollinearEdges };

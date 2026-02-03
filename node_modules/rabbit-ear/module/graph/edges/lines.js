/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { epsilonEqualVectors } from '../../math/compare.js';
import { pointsToLine, pointsToLine2, pointsToLine3 } from '../../math/convert.js';
import { subtract2, resize2, resize3, magnitude, dot, subtract } from '../../math/vector.js';
import { clampLine, collinearLines3 } from '../../math/line.js';
import { projectPointOnPlane } from '../../math/plane.js';
import { nearestPointOnLine } from '../../math/nearest.js';
import { uniqueElements, arrayMinimumIndex, arrayMaximumIndex } from '../../general/array.js';
import { clusterScalars, clusterParallelVectors, clusterSortedGeneric } from '../../general/cluster.js';
import { radialSortVectors3 } from '../../general/sort.js';
import { getDimensionQuick } from '../../fold/spec.js';
import { connectedComponents } from '../connectedComponents.js';
import { invertArrayToFlatMap, invertFlatToArrayMap } from '../maps.js';

const edgeToLine2 = ({ vertices_coords, edges_vertices }, edge) => {
	const [a, b] = edges_vertices[edge].map(v => vertices_coords[v]);
	return ({ vector: subtract2(b, a), origin: resize2(a) });
};
const edgesToLines = ({ vertices_coords, edges_vertices }) => (
	edges_vertices
		.map(ev => [vertices_coords[ev[0]], vertices_coords[ev[1]]])
		.map(([a, b]) => pointsToLine(a, b))
);
const edgesToLines2 = ({ vertices_coords, edges_vertices }) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	return edges_vertices
		.map(ev => [vertices_coords2[ev[0]], vertices_coords2[ev[1]]])
		.map(([a, b]) => pointsToLine2(a, b))
};
const edgesToLines3 = ({ vertices_coords, edges_vertices }) => {
	const vertices_coords3 = vertices_coords.map(resize3);
	return edges_vertices
		.map(ev => [vertices_coords3[ev[0]], vertices_coords3[ev[1]]])
		.map(([a, b]) => pointsToLine3(a, b))
};
const getEdgesLine = (
	{ vertices_coords, edges_vertices },
	epsilon = EPSILON,
) => {
	if (!vertices_coords || !edges_vertices || !edges_vertices.length) {
		return { edges_line: [], lines: [] };
	}
	const edgesLine = edgesToLines3({ vertices_coords, edges_vertices });
	const edgesOriginDistances = edgesLine
		.map(line => nearestPointOnLine(line, [0, 0, 0], clampLine))
		.map(point => magnitude(point));
	const distanceClusters = clusterScalars(edgesOriginDistances, epsilon);
	const parallelDistanceClusters = distanceClusters
		.map(cluster => cluster.map(i => edgesLine[i].vector))
		.map(cluster => clusterParallelVectors(cluster, 1e-3))
		.map((clusters, i) => clusters
			.map(cluster => cluster
				.map(index => distanceClusters[i][index])));
	const collinearParallelDistanceClusters = parallelDistanceClusters
		.map(clusters => clusters.map(cluster => {
			if (Math.abs(edgesOriginDistances[cluster[0]]) < epsilon) {
				return [cluster];
			}
			const clusterVector = edgesLine[cluster[0]].vector;
			const clusterPoints = cluster
				.map(e => vertices_coords[edges_vertices[e][0]])
				.map(point => projectPointOnPlane(point, clusterVector));
			const sortedIndices = radialSortVectors3(clusterPoints, clusterVector);
			const compareFn = (i, j) => (
				epsilonEqualVectors(clusterPoints[i], clusterPoints[j], epsilon)
			);
			const remap = cl => cl.map(i => sortedIndices[i]).map(i => cluster[i]);
			const clusterResult = clusterSortedGeneric(sortedIndices, compareFn);
			if (clusterResult.length === 1) { return clusterResult.map(remap); }
			const firstFirst = clusterResult[0][0];
			const last = clusterResult[clusterResult.length - 1];
			const lastLast = last[last.length - 1];
			const endIndices = [firstFirst, lastLast].map(i => sortedIndices[i]);
			if (compareFn(endIndices[0], endIndices[1])) {
				const lastCluster = clusterResult.pop();
				clusterResult[0] = lastCluster.concat(clusterResult[0]);
			}
			return clusterResult.map(remap);
		}));
	const lines_edges = collinearParallelDistanceClusters
		.flatMap(clusterOfClusters => clusterOfClusters
			.flatMap(clusters => clusters));
	const edges_line = invertArrayToFlatMap(lines_edges);
	const lines_vertices = lines_edges
		.map(edges => edges.flatMap(e => edges_vertices[e]))
		.map(uniqueElements);
	const lines_firstVector = lines_edges.map(edges => edgesLine[edges[0]].vector);
	const lines_vertProjects = lines_vertices
		.map((vertices, i) => vertices
			.map(v => dot(vertices_coords[v], lines_firstVector[i])));
	const lines_vertProjectsMin = lines_vertProjects
		.map((projections, i) => lines_vertices[i][arrayMinimumIndex(projections)]);
	const lines_vertProjectsMax = lines_vertProjects
		.map((projections, i) => lines_vertices[i][arrayMaximumIndex(projections)]);
	const lines_vector = lines_vertices.map((_, i) => subtract(
		vertices_coords[lines_vertProjectsMax[i]],
		vertices_coords[lines_vertProjectsMin[i]],
	));
	const lines_vectorN = getDimensionQuick({ vertices_coords }) === 2
		? lines_vector.map(resize2)
		: lines_vector.map(resize3);
	const lines_origin = lines_vertProjectsMin.map(v => vertices_coords[v]);
	const lines = lines_vectorN
		.map((vector, i) => ({ vector, origin: lines_origin[i] }));
	return {
		lines,
		edges_line,
	};
};
const getEdgesLineBruteForce = (
	{ vertices_coords, edges_vertices },
	epsilon = EPSILON,
) => {
	if (!vertices_coords || !edges_vertices || !edges_vertices.length) {
		return { edges_line: [], lines: [] };
	}
	const edgesLine = edgesToLines3({ vertices_coords, edges_vertices });
	const lines_lines = edgesLine.map(() => []);
	edgesLine.forEach((line0, e0) => edgesLine.forEach((line1, e1) => {
		if (e1 <= e0) { return; }
		if (collinearLines3(line0, line1, epsilon)) {
			lines_lines[e0].push(e1);
			lines_lines[e1].push(e0);
		}
	}));
	const edges_line = connectedComponents(lines_lines);
	const lines_edges = invertFlatToArrayMap(edges_line);
	const lines_vertices = lines_edges
		.map(edges => edges.flatMap(e => edges_vertices[e]))
		.map(uniqueElements);
	const lines_firstVector = lines_edges.map(edges => edgesLine[edges[0]].vector);
	const lines_vertProjects = lines_vertices
		.map((vertices, i) => vertices
			.map(v => dot(vertices_coords[v], lines_firstVector[i])));
	const lines_vertProjectsMin = lines_vertProjects
		.map((projections, i) => lines_vertices[i][arrayMinimumIndex(projections)]);
	const lines_vertProjectsMax = lines_vertProjects
		.map((projections, i) => lines_vertices[i][arrayMaximumIndex(projections)]);
	const lines_vector = lines_vertices.map((_, i) => subtract(
		vertices_coords[lines_vertProjectsMax[i]],
		vertices_coords[lines_vertProjectsMin[i]],
	));
	const lines_vectorN = getDimensionQuick({ vertices_coords }) === 2
		? lines_vector.map(resize2)
		: lines_vector.map(resize3);
	const lines_origin = lines_vertProjectsMin.map(v => vertices_coords[v]);
	const lines = lines_vectorN
		.map((vector, i) => ({ vector, origin: lines_origin[i] }));
	return {
		lines,
		edges_line,
	};
};

export { edgeToLine2, edgesToLines, edgesToLines2, edgesToLines3, getEdgesLine, getEdgesLineBruteForce };

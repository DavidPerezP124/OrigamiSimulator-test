/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { includeL, includeR, includeS } from '../../math/compare.js';
import { pointsToLine2 } from '../../math/convert.js';
import { mergeNextmaps } from '../maps.js';
import { intersectLineAndPoints, filterCollinearFacesData } from '../intersect.js';
import { splitEdge } from './splitEdge.js';
import { splitFace } from './splitFace.js';
import { addVertices } from '../add/vertex.js';

const arraysLengthSum = (...arrays) => arrays
	.map(arr => arr.length)
	.reduce((a, b) => a + b, 0);
const splitGraphWithLineAndPoints = (
	graph,
	{ vector, origin },
	lineDomain = includeL,
	interiorPoints = [],
	epsilon = EPSILON,
) => {
	if (!graph.vertices_coords || !graph.edges_vertices) {
		return {};
	}
	let edgeMap = graph.edges_vertices.map((_, i) => [i]);
	let faceMap = graph.faces_vertices.map((_, i) => [i]);
	const verticesSource = [];
	const edgesSource = [];
	const intersections = intersectLineAndPoints(
		graph,
		{ vector, origin },
		lineDomain,
		interiorPoints,
		epsilon,
	);
	filterCollinearFacesData(graph, intersections);
	const oldEdgeNewVertex = {};
	intersections.edges
		.map((intersection, edge) => (intersection
			? ({ ...intersection, edge })
			: undefined))
		.filter(a => a !== undefined)
		.forEach(({ a, b, point, edge }) => {
			const newEdge = edgeMap[edge][0];
			const [v0, v1] = graph.edges_vertices[newEdge];
			const vertices = [v0, v1];
			const { vertex, edges: { map } } = splitEdge(graph, newEdge, point);
			verticesSource[vertex] = { a, b, vertices, edge, point };
			edgeMap = mergeNextmaps(edgeMap, map);
			oldEdgeNewVertex[edge] = vertex;
		});
	const oldFaceNewEdge = {};
	intersections.faces
		.map(({ vertices, edges, points }, face) => ({ vertices, edges, points, face }))
		.filter(({ vertices, edges, points }) => (
			arraysLengthSum(vertices, edges, points) === 2))
		.forEach(({ vertices, edges, points, face }) => {
			const newFace = faceMap[face][0];
			const splitEdgesVertices = edges.map(({ edge }) => oldEdgeNewVertex[edge]);
			const isolatedPointVertices = addVertices(
				graph,
				points.map(({ point }) => point),
			);
			const allNewVertices = vertices.map(({ vertex }) => vertex)
				.concat(splitEdgesVertices)
				.concat(isolatedPointVertices);
			const newEdgeVertices = [allNewVertices[0], allNewVertices[1]];
			const {
				edge: newEdgeIndex,
				faces: { map },
			} = splitFace(graph, newFace, newEdgeVertices);
			edgesSource[newEdgeIndex] = { face, faces: undefined };
			isolatedPointVertices.forEach((vertex, i) => {
				verticesSource[vertex] = { ...points[i], face, faces: undefined };
			});
			faceMap = map === undefined ? faceMap : mergeNextmaps(faceMap, map);
			oldFaceNewEdge[face] = newEdgeIndex;
		});
	verticesSource.forEach(({ face }, i) => {
		if (face !== undefined) { verticesSource[i].faces = faceMap[face]; }
	});
	edgesSource.forEach(({ face }, i) => {
		if (face !== undefined) { edgesSource[i].faces = faceMap[face]; }
	});
	return {
		vertices: {
			intersect: intersections.vertices,
			source: verticesSource,
		},
		edges: {
			intersect: intersections.edges,
			new: Object.values(oldFaceNewEdge),
			map: edgeMap,
			source: edgesSource,
		},
		faces: {
			intersect: intersections.faces,
			map: faceMap,
		},
	};
};
const splitGraphWithLine = (graph, line, epsilon = EPSILON) => (
	splitGraphWithLineAndPoints(
		graph,
		line,
		includeL,
		[],
		epsilon,
	));
const splitGraphWithRay = (graph, ray, epsilon = EPSILON) => (
	splitGraphWithLineAndPoints(
		graph,
		ray,
		includeR,
		[ray.origin],
		epsilon,
	));
const splitGraphWithSegment = (graph, segment, epsilon = EPSILON) => (
	splitGraphWithLineAndPoints(
		graph,
		pointsToLine2(segment[0], segment[1]),
		includeS,
		segment,
		epsilon,
	));

export { splitGraphWithLine, splitGraphWithLineAndPoints, splitGraphWithRay, splitGraphWithSegment };

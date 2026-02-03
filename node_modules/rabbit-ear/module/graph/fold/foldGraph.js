/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { includeL, includeR, includeS } from '../../math/compare.js';
import { pointsToLine2 } from '../../math/convert.js';
import { resize2 } from '../../math/vector.js';
import { clone } from '../../general/clone.js';
import { assignmentFlatFoldAngle, invertAssignment } from '../../fold/spec.js';
import { makeVerticesCoordsFolded } from '../vertices/folded.js';
import { faceContainingPoint } from '../faces/facePoint.js';
import { makeFacesWinding } from '../faces/winding.js';
import { splitGraphWithLineAndPoints } from '../split/splitGraph.js';
import { transferPointInFaceBetweenGraphs } from '../transfer.js';
import { makeEdgesFacesUnsorted } from '../make/edgesFaces.js';
import { makeEdgesFoldAngle } from '../make/edgesFoldAngle.js';
import { recalculatePointAlongEdge, reassignCollinearEdges, updateFaceOrders } from './general.js';

const foldGraph = (
	graph,
	{ vector, origin },
	lineDomain = includeL,
	interiorPoints = [],
	assignment = "V",
	foldAngle = undefined,
	vertices_coordsFolded = undefined,
	epsilon = EPSILON,
) => {
	if (foldAngle !== undefined && !graph.edges_foldAngle && graph.edges_assignment) {
		graph.edges_foldAngle = makeEdgesFoldAngle(graph);
	}
	if (!graph.edges_faces) {
		graph.edges_faces = makeEdgesFacesUnsorted(graph);
	}
	if (foldAngle === undefined) {
		foldAngle = assignmentFlatFoldAngle[assignment] || 0;
	}
	if (vertices_coordsFolded === undefined) {
		const rootFace = faceContainingPoint(graph, origin, vector);
		vertices_coordsFolded = makeVerticesCoordsFolded(graph, [rootFace]);
	}
	const oppositeAssignment = invertAssignment(assignment);
	const oppositeFoldAngle = foldAngle === 0 ? 0 : -foldAngle;
	const vertices_coordsCP = clone(graph.vertices_coords);
	Object.assign(graph, { vertices_coords: clone(vertices_coordsFolded) });
	const splitGraphResult = splitGraphWithLineAndPoints(
		graph,
		{ vector, origin },
		lineDomain,
		interiorPoints,
		epsilon,
	);
	const newFaces = Array.from(new Set(splitGraphResult.edges.new
		.flatMap(e => graph.edges_faces[e])));
	const faces_winding = makeFacesWinding(graph);
	const vertices_coordsFoldedNew = clone(graph.vertices_coords);
	Object.assign(graph, { vertices_coords: vertices_coordsCP });
	const foldedForm = {
		...graph,
		vertices_coords: vertices_coordsFoldedNew,
	};
	const splitGraphVerticesSource = splitGraphResult.vertices.source
		.map((intersect, vertex) => ({ ...intersect, vertex }));
	splitGraphVerticesSource
		.map(el => ("point" in el && "face" in el && "faces" in el && "vertex" in el
			? el
			: undefined))
		.filter(a => a !== undefined)
		.forEach(({ point, faces, vertex }) => {
			graph.vertices_coords[vertex] = transferPointInFaceBetweenGraphs(
				foldedForm,
				graph,
				faces[0],
				point,
			);
		});
	splitGraphVerticesSource
		.map(el => ("vertices" in el && "vertex" in el && "b" in el ? el : undefined))
		.filter(a => a !== undefined)
		.forEach(({ b, vertices, vertex }) => {
			graph.vertices_coords[vertex] = recalculatePointAlongEdge(
				vertices.map(v => graph.vertices_coords[v]).map(resize2),
				b,
			);
		});
	const edgesAttributes = splitGraphResult.edges.source
		.map(({ faces }) => ({
			assign: faces_winding[faces[0]] ? assignment : oppositeAssignment,
			angle: faces_winding[faces[0]] ? foldAngle : oppositeFoldAngle,
		}));
	if (graph.edges_assignment) {
		edgesAttributes.forEach(({ assign }, edge) => {
			graph.edges_assignment[edge] = assign;
		});
	}
	if (graph.edges_foldAngle) {
		edgesAttributes.forEach(({ angle }, edge) => {
			graph.edges_foldAngle[edge] = angle;
		});
	}
	const edgesReassigned = reassignCollinearEdges(
		graph,
		{ assignment, foldAngle, oppositeAssignment, oppositeFoldAngle },
		faces_winding,
		splitGraphResult,
	);
	updateFaceOrders(
		graph,
		{ ...graph, vertices_coords: vertices_coordsFoldedNew },
		{ vector, origin },
		foldAngle,
		faces_winding,
		[...splitGraphResult.edges.new, ...edgesReassigned],
		newFaces,
	);
	return {
		edges: {
			map: splitGraphResult.edges.map,
			new: splitGraphResult.edges.new,
			reassigned: edgesReassigned,
		},
		faces: {
			map: splitGraphResult.faces.map,
			new: newFaces,
		},
	};
};
const foldLine = (
	graph,
	line,
	assignment = "V",
	foldAngle = undefined,
	vertices_coordsFolded = undefined,
	epsilon = EPSILON,
) => (
	foldGraph(
		graph,
		line,
		includeL,
		[],
		assignment,
		foldAngle,
		vertices_coordsFolded,
		epsilon,
	));
const foldRay = (
	graph,
	ray,
	assignment = "V",
	foldAngle = undefined,
	vertices_coordsFolded = undefined,
	epsilon = EPSILON,
) => (
	foldGraph(
		graph,
		ray,
		includeR,
		[ray.origin],
		assignment,
		foldAngle,
		vertices_coordsFolded,
		epsilon,
	));
const foldSegment = (
	graph,
	segment,
	assignment = "V",
	foldAngle = undefined,
	vertices_coordsFolded = undefined,
	epsilon = EPSILON,
) => (
	foldGraph(
		graph,
		pointsToLine2(segment[0], segment[1]),
		includeS,
		segment,
		assignment,
		foldAngle,
		vertices_coordsFolded,
		epsilon,
	));

export { foldGraph, foldLine, foldRay, foldSegment };

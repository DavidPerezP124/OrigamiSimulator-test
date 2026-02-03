/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { edgeFoldAngleIsFlatFolded } from '../../fold/spec.js';
import { epsilonEqual } from '../../math/compare.js';
import { pointsToLine2 } from '../../math/convert.js';
import { add2, scale2, resize2, average2, cross2, subtract2 } from '../../math/vector.js';
import { invertFlatMap } from '../maps.js';

const recalculatePointAlongEdge = (points, parameter) => {
	const edgeLine = pointsToLine2(points[0], points[1]);
	return add2(edgeLine.origin, scale2(edgeLine.vector, parameter));
};
const reassignCollinearEdges = (
	{ edges_vertices, edges_faces, edges_assignment, edges_foldAngle },
	{ assignment, foldAngle, oppositeAssignment, oppositeFoldAngle },
	faces_winding,
	splitGraphResult,
) => {
	const verticesCollinear = splitGraphResult.vertices.intersect
		.map(v => v !== undefined);
	const collinearEdges = edges_vertices
		.map(verts => verticesCollinear[verts[0]] && verticesCollinear[verts[1]])
		.map((collinear, e) => (collinear ? e : undefined))
		.filter(a => a !== undefined);
	const reassignableCollinearEdges = collinearEdges
		.map(edge => ({
			edge,
			faces: edges_faces[edge].filter(a => a !== undefined),
		}))
		.filter(({ faces }) => faces.length === 2)
		.filter(({ faces: [f0, f1] }) => faces_winding[f0] === faces_winding[f1]);
	reassignableCollinearEdges.forEach(({ edge, faces }) => {
		const winding = faces.map(face => faces_winding[face]).shift();
		edges_assignment[edge] = winding ? assignment : oppositeAssignment;
		edges_foldAngle[edge] = winding ? foldAngle : oppositeFoldAngle;
	});
	return reassignableCollinearEdges.map(({ edge }) => edge);
};
const adjacentFacesOrdersAssignments = (f0, f1, assignment) => {
	switch (assignment) {
	case "V":
	case "v": return [f0, f1, 1];
	case "M":
	case "m": return [f0, f1, -1];
	default: return undefined;
	}
};
const adjacentFacesOrdersFoldAngles = (f0, f1, foldAngle) => {
	if (epsilonEqual(foldAngle, 180)) { return [f0, f1, 1]; }
	if (epsilonEqual(foldAngle, -180)) { return [f0, f1, -1]; }
	return undefined;
};
const makeNewFlatFoldFaceOrders = ({
	edges_faces, edges_assignment, edges_foldAngle,
}, newEdges) => {
	const edges = newEdges.filter(e => edges_faces[e].length === 2);
	const edgesAdjacentFaces = edges.map(e => edges_faces[e]);
	if (edges_assignment) {
		const assignments = edges.map(e => edges_assignment[e]);
		return edgesAdjacentFaces
			.map(([f0, f1], i) => adjacentFacesOrdersAssignments(f0, f1, assignments[i]))
			.filter(a => a !== undefined);
	}
	if (edges_foldAngle) {
		const angles = edges.map(e => edges_foldAngle[e]);
		return edgesAdjacentFaces
			.map(([f0, f1], i) => adjacentFacesOrdersFoldAngles(f0, f1, angles[i]))
			.filter(a => a !== undefined);
	}
	return [];
};
const getInvalidFaceOrders = (
	{ vertices_coords, faces_vertices, faceOrders },
	line,
	newFaces,
) => {
	if (!faceOrders) { return []; }
	const newFacesLookup = invertFlatMap(newFaces);
	const facesSide = faces_vertices
		.map(vertices => vertices.map(v => vertices_coords[v]))
		.map(poly => poly.map(resize2)).map(poly => average2(...poly))
		.map(point => cross2(subtract2(point, line.origin), line.vector))
		.map(Math.sign);
	return faceOrders
		.map(([a, b], i) => (
			(newFacesLookup[a] !== undefined || newFacesLookup[b] !== undefined)
			&& ((facesSide[a] === 1 && facesSide[b] === -1)
			|| (facesSide[a] === -1 && facesSide[b] === 1))
				? i
				: undefined))
		.filter(a => a !== undefined);
};
const updateFlatFoldedInvalidFaceOrders = (
	{ faceOrders },
	invalidFaceOrders,
	foldAngle,
	faces_winding,
) => {
	const valley = { true: 1, false: -1 };
	const mountain = { true: -1, false: 1 };
	invalidFaceOrders.forEach(i => {
		const [a, b] = faceOrders[i];
		const newOrder = foldAngle > 0
			? valley[faces_winding[b]]
			: mountain[faces_winding[b]];
		faceOrders[i] = [a, b, newOrder];
	});
};
const updateFaceOrders = (
	graph,
	folded,
	line,
	foldAngle,
	faces_winding,
	newEdges,
	newFaces,
) => {
	const isFlatFolded = edgeFoldAngleIsFlatFolded(foldAngle);
	if (!graph.faceOrders && isFlatFolded) { graph.faceOrders = []; }
	if (isFlatFolded) {
		const newFaceOrders = makeNewFlatFoldFaceOrders(graph, newEdges);
		graph.faceOrders = graph.faceOrders.concat(newFaceOrders);
	}
	if (graph.faceOrders) {
		const nowInvalidFaceOrders = getInvalidFaceOrders(
			folded,
			line,
			newFaces,
		);
		if (isFlatFolded) {
			updateFlatFoldedInvalidFaceOrders(graph, nowInvalidFaceOrders, foldAngle, faces_winding);
		} else {
			const invalidOrderLookup = {};
			nowInvalidFaceOrders.forEach(i => { invalidOrderLookup[i] = true; });
			graph.faceOrders = graph.faceOrders.filter((_, i) => !invalidOrderLookup[i]);
		}
	}
};

export { getInvalidFaceOrders, makeNewFlatFoldFaceOrders, reassignCollinearEdges, recalculatePointAlongEdge, updateFaceOrders, updateFlatFoldedInvalidFaceOrders };

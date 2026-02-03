/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { includeL } from '../../math/compare.js';
import { pointsToLine2 } from '../../math/convert.js';
import { add2, scale2 } from '../../math/vector.js';
import { assignmentFlatFoldAngle, invertAssignment } from '../../fold/spec.js';
import { makeEdgesFacesUnsorted } from '../make/edgesFaces.js';
import { splitLineIntoEdges } from '../split/splitLine.js';
import { makeFacesWinding } from '../faces/winding.js';
import { transferPointInFaceBetweenGraphs } from '../transfer.js';

const transferPointOnEdgeBetweenGraphs = (to, edge, parameter) => {
	const edgeSegment = to.edges_vertices[edge]
		.map(v => to.vertices_coords[v]);
	const edgeLine = pointsToLine2(edgeSegment[0], edgeSegment[1]);
	return add2(edgeLine.origin, scale2(edgeLine.vector, parameter));
};
const transferPoint = (from, to, { vertex, edge, face, point, b }) => {
	if (vertex !== undefined) {
		return to.vertices_coords[vertex];
	}
	if (edge !== undefined) {
		return transferPointOnEdgeBetweenGraphs(to, edge, b);
	}
	if (face !== undefined) {
		return transferPointInFaceBetweenGraphs(from, to, face, point);
	}
	throw new Error("transferPoint() failed");
};
const foldGraphIntoSubgraph = (
	cp,
	folded,
	line,
	lineDomain = includeL,
	interiorPoints = [],
	assignment = "V",
	foldAngle = undefined,
	epsilon = EPSILON,
) => {
	if (foldAngle === undefined) {
		foldAngle = assignmentFlatFoldAngle[assignment] || 0;
	}
	const oppositeAssignment = invertAssignment(assignment);
	const oppositeFoldAngle = foldAngle === 0 ? 0 : -foldAngle;
	const faces_winding = makeFacesWinding(folded);
	const {
		vertices,
		edges_vertices,
		edges_collinear,
		edges_face,
	} = splitLineIntoEdges(
		folded,
		line,
		lineDomain,
		interiorPoints,
		epsilon,
	);
	const vertices_coords = vertices
		.map(pointInfo => transferPoint(folded, cp, pointInfo));
	const edges_assignment = edges_face
		.map((face) => (faces_winding[face] ? assignment : oppositeAssignment));
	const edges_foldAngle = edges_face
		.map((face) => (faces_winding[face] ? foldAngle : oppositeFoldAngle));
	const edges_faces = cp.edges_faces ? cp.edges_faces : makeEdgesFacesUnsorted(cp);
	const reassignable = { F: true, f: true, U: true, u: true };
	edges_collinear
		.map((collinear, e) => (collinear ? e : undefined))
		.filter(a => a !== undefined)
		.forEach(edge => {
			if (!reassignable[edges_assignment[edge]]) { return; }
			const face = edges_faces[edge]
				.filter(a => a !== undefined)
				.shift();
			const winding = faces_winding[face];
			edges_assignment[edge] = winding ? assignment : oppositeAssignment;
			edges_foldAngle[edge] = winding ? foldAngle : oppositeFoldAngle;
		});
	return {
		vertices_coords,
		edges_vertices,
		edges_assignment,
		edges_foldAngle,
	};
};

export { foldGraphIntoSubgraph, transferPoint };

/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { includeL } from '../../math/compare.js';
import { resize2, add2, scale2 } from '../../math/vector.js';
import { invertAssignment } from '../../fold/spec.js';
import { makeFacesEdgesFromVertices } from '../make/facesEdges.js';
import { makeVerticesCoordsFlatFolded } from '../vertices/folded.js';
import { makeFacesWinding } from '../faces/winding.js';
import { faceContainingPoint } from '../faces/facePoint.js';
import { intersectLine } from '../intersect.js';
import { edgesToLines2 } from '../edges/lines.js';

const foldGraphIntoSegments = ({
	vertices_coords, edges_vertices, edges_foldAngle, edges_assignment,
	faces_vertices, faces_edges, faces_faces,
}, { vector, origin }, assignment = "V", epsilon = EPSILON) => {
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	const startFace = faceContainingPoint(
		{ vertices_coords, faces_vertices },
		origin,
		vector,
	);
	const oppositeAssignment = invertAssignment(assignment);
	const vertices_coordsFolded = makeVerticesCoordsFlatFolded({
		vertices_coords,
		edges_vertices,
		edges_foldAngle,
		edges_assignment,
		faces_vertices,
		faces_faces,
	}, [startFace]);
	const edges_line = edgesToLines2({ vertices_coords, edges_vertices });
	const faces_winding = makeFacesWinding({
		vertices_coords: vertices_coordsFolded,
		faces_vertices,
	});
	if (!faces_winding[startFace]) {
		faces_winding.forEach((w, i) => { faces_winding[i] = !w; });
	}
	const { faces } = intersectLine(
		{ vertices_coords: vertices_coordsFolded, edges_vertices, faces_vertices, faces_edges },
		{ vector, origin },
		includeL,
		epsilon,
	);
	faces.forEach((arr, f) => { if (arr.length !== 2) { delete faces[f]; } });
	const remapPoint = ({ vertex, edge, b }) => (vertex !== undefined
		? resize2(vertices_coords[vertex])
		: add2(scale2(edges_line[edge].vector, b), edges_line[edge].origin));
	return faces.map((intersections, f) => ({
		intersections,
		assignment: faces_winding[f] ? assignment : oppositeAssignment,
		points: intersections.map(remapPoint),
	}));
};

export { foldGraphIntoSegments };

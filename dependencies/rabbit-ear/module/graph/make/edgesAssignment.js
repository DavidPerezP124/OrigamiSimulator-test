/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeFacesEdgesFromVertices } from './facesEdges.js';
import { makeEdgesFacesUnsorted } from './edgesFaces.js';

const makeEdgesAssignmentSimple = ({ edges_foldAngle }) => edges_foldAngle
	.map(a => {
		if (a === 0) { return "F"; }
		return a < 0 ? "M" : "V";
	});
const makeEdgesAssignment = ({
	edges_vertices, edges_foldAngle, edges_faces, faces_vertices, faces_edges,
}) => {
	if (edges_vertices && !edges_faces) {
		if (!faces_edges && faces_vertices) {
			faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
		}
		if (faces_edges) {
			edges_faces = makeEdgesFacesUnsorted({ edges_vertices, faces_edges });
		}
	}
	if (edges_foldAngle) {
		return edges_faces
			? edges_foldAngle.map((a, i) => {
				if (edges_faces[i].length < 2) { return "B"; }
				if (a === 0) { return "F"; }
				return a < 0 ? "M" : "V";
			})
			: makeEdgesAssignmentSimple({ edges_foldAngle });
	}
	return edges_vertices.map(() => "U");
};

export { makeEdgesAssignment, makeEdgesAssignmentSimple };

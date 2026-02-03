/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { normalize2, subtract2, cross2, magnitude2, scale2, dot2 } from '../../math/vector.js';
import { invertMatrix2, multiplyMatrix2Line2, multiplyMatrices2, makeMatrix2Reflect } from '../../math/matrix2.js';
import { edgeAssignmentToFoldAngle } from '../../fold/spec.js';
import { mergeNextmaps } from '../maps.js';
import { makeFacesMatrix2 } from '../faces/matrix.js';
import { makeVerticesCoordsFoldedFromMatrix2 } from '../vertices/folded.js';
import { makeVerticesEdgesUnsorted } from '../make/verticesEdges.js';
import { faceContainingPoint } from '../faces/facePoint.js';
import { makeFacesWindingFromMatrix2 } from '../faces/winding.js';
import { splitFaceWithLine } from './flatFoldSplitFace.js';
import { populate } from '../populate.js';

const make_face_side = (vector, origin, face_center, face_winding) => {
	const center_vector = subtract2(face_center, origin);
	const determinant = cross2(vector, center_vector);
	return face_winding ? determinant > 0 : determinant < 0;
};
const make_face_center = (graph, face) => (!graph.faces_vertices[face]
	? [0, 0]
	: graph.faces_vertices[face]
		.map(v => graph.vertices_coords[v])
		.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0])
		.map(el => el / graph.faces_vertices[face].length));
const unfolded_assignment = {
	F: true, f: true, U: true, u: true,
};
const opposite_lookup = {
	M: "V", m: "V", V: "M", v: "M",
};
const get_opposite_assignment = assign => opposite_lookup[assign] || assign;
const face_snapshot = (graph, face) => ({
	center: graph.faces_center[face],
	matrix: graph.faces_matrix2[face],
	winding: graph.faces_winding[face],
	crease: graph.faces_crease[face],
	side: graph.faces_side[face],
	layer: graph.faces_layer[face],
});
const foldFacesLayer = (faces_layer, faces_folding) => {
	const new_faces_layer = [];
	const arr = faces_layer.map((_, i) => i);
	const folding = arr.filter(i => faces_folding[i]);
	const not_folding = arr.filter(i => !faces_folding[i]);
	not_folding
		.sort((a, b) => faces_layer[a] - faces_layer[b])
		.forEach((face, i) => { new_faces_layer[face] = i; });
	folding
		.sort((a, b) => faces_layer[b] - faces_layer[a])
		.forEach((face, i) => { new_faces_layer[face] = not_folding.length + i; });
	return new_faces_layer;
};
const getVerticesCollinearToLine = (
	{ vertices_coords },
	{ vector, origin },
	epsilon = EPSILON,
) => {
	const normalizedLineVec = normalize2(vector);
	const pointIsCollinear = (point) => {
		const originToPoint = subtract2(point, origin);
		const mag = magnitude2(originToPoint);
		if (Math.abs(mag) < epsilon) { return true; }
		const originToPointUnit = scale2(originToPoint, 1 / mag);
		const dotprod = Math.abs(dot2(originToPointUnit, normalizedLineVec));
		return Math.abs(1.0 - dotprod) < epsilon;
	};
	return vertices_coords
		.map(pointIsCollinear)
		.map((a, i) => ({ a, i }))
		.filter(el => el.a)
		.map(el => el.i);
};
const getEdgesCollinearToLine = (
	{ vertices_coords, edges_vertices, vertices_edges },
	{ vector, origin },
	epsilon = EPSILON,
) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const verticesCollinear = getVerticesCollinearToLine(
		{ vertices_coords },
		{ vector, origin },
		epsilon,
	);
	const edgesCollinearCount = edges_vertices.map(() => 0);
	verticesCollinear
		.forEach(vertex => vertices_edges[vertex]
			.forEach(edge => { edgesCollinearCount[edge] += 1; }));
	return edgesCollinearCount
		.map((count, i) => ({ count, i }))
		.filter(el => el.count === 2)
		.map(el => el.i);
};
const flatFold = (
	graph,
	{ vector, origin },
	assignment = "V",
	epsilon = EPSILON,
) => {
	const opposite_assignment = get_opposite_assignment(assignment);
	populate(graph);
	if (!graph.faces_layer) {
		graph.faces_layer = Array(graph.faces_vertices.length).fill(0);
	}
	graph.faces_center = graph.faces_vertices
		.map((_, i) => make_face_center(graph, i));
	if (!graph.faces_matrix2) {
		graph.faces_matrix2 = makeFacesMatrix2(
			graph,
			[faceContainingPoint(graph, origin, vector)],
		);
	}
	graph.faces_winding = makeFacesWindingFromMatrix2(graph.faces_matrix2);
	graph.faces_crease = graph.faces_matrix2
		.map(invertMatrix2)
		.map(matrix => multiplyMatrix2Line2(matrix, { vector, origin }));
	graph.faces_side = graph.faces_vertices
		.map((_, i) => make_face_side(
			graph.faces_crease[i].vector,
			graph.faces_crease[i].origin,
			graph.faces_center[i],
			graph.faces_winding[i],
		));
	const vertices_coords_folded = makeVerticesCoordsFoldedFromMatrix2(
		graph,
		graph.faces_matrix2,
	);
	const collinear_edges = getEdgesCollinearToLine({
		vertices_coords: vertices_coords_folded,
		edges_vertices: graph.edges_vertices,
	}, { vector, origin }, epsilon)
		.filter(e => unfolded_assignment[graph.edges_assignment[e]]);
	collinear_edges
		.map(e => graph.edges_faces[e].find(f => f != null))
		.map(f => graph.faces_winding[f])
		.map(winding => (winding ? assignment : opposite_assignment))
		.forEach((assign, e) => {
			graph.edges_assignment[collinear_edges[e]] = assign;
			graph.edges_foldAngle[collinear_edges[e]] = edgeAssignmentToFoldAngle(
				assign,
			);
		});
	const face0 = face_snapshot(graph, 0);
	const split_changes = graph.faces_vertices
		.map((_, i) => i)
		.reverse()
		.map((i) => {
			const face = face_snapshot(graph, i);
			const change = splitFaceWithLine(graph, i, face.crease, epsilon);
			if (change === undefined) { return undefined; }
			graph.edges_assignment[change.edges.new] = face.winding
				? assignment
				: opposite_assignment;
			graph.edges_foldAngle[change.edges.new] = edgeAssignmentToFoldAngle(
				graph.edges_assignment[change.edges.new],
			);
			const new_faces = change.faces.map[change.faces.remove];
			new_faces.forEach(f => {
				graph.faces_center[f] = make_face_center(graph, f);
				graph.faces_side[f] = make_face_side(
					face.crease.vector,
					face.crease.origin,
					graph.faces_center[f],
					face.winding,
				);
				graph.faces_layer[f] = face.layer;
			});
			return change;
		})
		.filter(a => a !== undefined);
	const faces_map = mergeNextmaps(...split_changes.map(el => el.faces.map));
	const edges_map = mergeNextmaps(...split_changes.map(el => el.edges.map)
		.filter(a => a !== undefined));
	const faces_remove = split_changes.map(el => el.faces.remove).reverse();
	graph.faces_layer = foldFacesLayer(
		graph.faces_layer,
		graph.faces_side,
	);
	const face0_was_split = faces_map && faces_map[0] && faces_map[0].length === 2;
	const face0_newIndex = (face0_was_split
		? faces_map[0].filter(f => graph.faces_side[f]).shift()
		: 0);
	let face0_preMatrix = face0.matrix;
	if (assignment !== opposite_assignment) {
		face0_preMatrix = (!face0_was_split && !graph.faces_side[0]
			? face0.matrix
			: multiplyMatrices2(
				face0.matrix,
				makeMatrix2Reflect(
					face0.crease.vector,
					face0.crease.origin,
				),
			)
		);
	}
	graph.faces_matrix2 = makeFacesMatrix2(graph, [face0_newIndex])
		.map(matrix => multiplyMatrices2(face0_preMatrix, matrix));
	delete graph.faces_center;
	delete graph.faces_winding;
	delete graph.faces_crease;
	delete graph.faces_side;
	return {
		faces: { map: faces_map, remove: faces_remove },
		edges: { map: edges_map },
	};
};

export { flatFold, getEdgesCollinearToLine, getVerticesCollinearToLine };

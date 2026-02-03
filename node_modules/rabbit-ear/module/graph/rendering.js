/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { resize3, scale3, add3 } from '../math/vector.js';
import { invertMatrix4, multiplyMatrix4Vector3 } from '../math/matrix4.js';
import { clone } from '../general/clone.js';
import { faceOrdersSubset, nudgeFacesWithFaceOrders } from './orders.js';
import { countEdges, countImpliedEdges } from './count.js';
import { invertArrayToFlatMap } from './maps.js';
import { triangulate } from './triangulate.js';
import { explodeFaces } from './explode.js';
import { fixCycles } from './cycles.js';
import { getFacesPlane } from './faces/planes.js';
import { subgraphWithFaces } from './subgraph.js';
import { join } from './join.js';

const LAYER_NUDGE = 5e-6;
const prepareForRenderingWithCycles = (inputGraph, { earcut, layerNudge } = {}) => {
	const graph = clone(inputGraph);
	const {
		planes_faces,
		planes_transform,
	} = getFacesPlane(graph);
	if (!graph.faceOrders) {
		return triangulate(graph, earcut).result;
	}
	const planes_inverseTransform = planes_transform.map(invertMatrix4);
	const planes_faceOrders = planes_faces
		.map(faces => faceOrdersSubset(graph.faceOrders, faces));
	const graph3 = {
		...graph,
		vertices_coords: graph.vertices_coords.map(resize3),
	};
	const planes_graphs = planes_faces
		.map(faces => subgraphWithFaces(graph3, faces));
	const planes_graphXY = planes_graphs
		.map((g, p) => ({
			...g,
			vertices_coords: g.vertices_coords
				.map(coord => multiplyMatrix4Vector3(planes_transform[p], coord)),
		}));
	const planes_graphXYFixed = planes_graphXY
		.map((g, p) => fixCycles({
			...g,
			faceOrders: planes_faceOrders[p],
		}));
	const planes_graphFixed = planes_graphXYFixed
		.map((graphXY, p) => ({
			...graphXY,
			vertices_coords: graphXY.vertices_coords
				.map(resize3)
				.map(coord => multiplyMatrix4Vector3(planes_inverseTransform[p], coord)),
		}));
	const planes_facesNudge = planes_graphFixed
		.map(graphXY => nudgeFacesWithFaceOrders(graphXY));
	const planes_triangulatedVerbose = planes_graphFixed
		.map(g => triangulate(g, earcut));
	const planes_graphExploded = planes_triangulatedVerbose
		.map(({ result }) => result)
		.map(explodeFaces);
	planes_triangulatedVerbose.forEach(({ changes }, p) => {
		const backmap = invertArrayToFlatMap(changes.faces.map);
		const verticesOffset = planes_graphExploded[p].vertices_coords
			.map(() => undefined);
		backmap.forEach((oldFace, face) => {
			const nudge = planes_facesNudge[p][oldFace];
			if (!nudge) { return; }
			planes_graphExploded[p].faces_vertices[face].forEach(v => {
				verticesOffset[v] = scale3(nudge.vector, nudge.layer * layerNudge);
			});
		});
		verticesOffset.forEach((offset, v) => {
			if (!offset) { return; }
			planes_graphExploded[p].vertices_coords[v] = add3(
				resize3(planes_graphExploded[p].vertices_coords[v]),
				offset,
			);
		});
	});
	if (planes_graphExploded.length > 1) {
		planes_graphExploded.forEach((exploded, i) => {
			if (i === 0) { return; }
			join(planes_graphExploded[0], exploded);
		});
	}
	return planes_graphExploded[0];
};
const prepareForRendering = (inputGraph, { earcut, layerNudge = LAYER_NUDGE } = {}) => {
	const graph = clone(inputGraph);
	if (!graph.edges_assignment) {
		const edgeCount = countEdges(graph) || countImpliedEdges(graph);
		if (edgeCount) {
			graph.edges_assignment = Array(edgeCount).fill("U");
		}
	}
	if (!graph.faceOrders) {
		return explodeFaces(triangulate(graph, earcut).result);
	}
	const faces_nudge = nudgeFacesWithFaceOrders(graph);
	if (!faces_nudge) {
		return prepareForRenderingWithCycles(inputGraph, { earcut, layerNudge });
	}
	const {
		changes,
		result: triangulated,
	} = triangulate(graph, earcut);
	const exploded = explodeFaces(triangulated);
	if (changes.faces) {
		const backmap = invertArrayToFlatMap(changes.faces.map);
		backmap.forEach((oldFace, face) => {
			const nudge = faces_nudge[oldFace];
			if (!nudge) { return; }
			exploded.faces_vertices[face].forEach(v => {
				const vec = scale3(nudge.vector, nudge.layer * layerNudge);
				exploded.vertices_coords[v] = add3(
					resize3(exploded.vertices_coords[v]),
					vec,
				);
			});
		});
	}
	return exploded;
};

export { prepareForRendering, prepareForRenderingWithCycles };

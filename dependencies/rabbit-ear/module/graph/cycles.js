/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { topologicalSort } from './directedGraph.js';
import { makeFacesWinding } from './faces/winding.js';
import { join } from './join.js';
import { makeEdgesFacesUnsorted } from './make/edgesFaces.js';
import { invertArrayMap } from './maps.js';
import { makeFacesNormal } from './normals.js';
import { faceOrdersToDirectedEdges } from './orders.js';
import { planarizeVerbose } from './planarize/planarize.js';

const makeOneSide = (planar, flatBackmap) => {
	planar.edges_faces.forEach((faces, e) => {
		if (faces.length !== 2) { return; }
		const [a, b] = faces.map(f => flatBackmap[f]);
		if (a === b && planar.edges_assignment) {
			planar.edges_assignment[e] = "J";
		}
		if (a === b && planar.edges_foldAngle) {
			planar.edges_foldAngle[e] = 0;
		}
	});
	return planar;
};
const correctFaceWinding = (planar, faces_winding, flatBackmap) => (
	planar.faces_vertices
		.map((_, i) => i)
		.filter(f => !faces_winding[flatBackmap[f]])
		.forEach(f => {
			planar.faces_vertices[f].reverse();
			planar.faces_edges[f].reverse();
			planar.faces_edges[f].push(planar.faces_edges[f].shift());
		}));
const fixCycles = (graph) => {
	const {
		result: planar,
		changes: { faces: { map } },
	} = planarizeVerbose(graph);
	planar.edges_faces = makeEdgesFacesUnsorted(planar);
	const facesBackMap = invertArrayMap(map);
	if (!planar.edges_assignment && planar.edges_vertices) {
		planar.edges_assignment = planar.edges_vertices.map(() => "U");
	}
	const faces_normal = makeFacesNormal(graph);
	const directedFacesOld = faceOrdersToDirectedEdges({ ...graph, faces_normal });
	const faces_winding = makeFacesWinding(graph);
	const facesBackMapOrdered = facesBackMap.map(faces => {
		const lookup = {};
		faces.forEach(f => { lookup[f] = true; });
		const theseFaces = directedFacesOld.filter(([a, b]) => lookup[a] && lookup[b]);
		const facesSorted = topologicalSort(theseFaces);
		const missingFaces = faces.filter(f => facesSorted.indexOf(f) === -1);
		return missingFaces.concat(facesSorted);
	});
	const faceMapFront = facesBackMapOrdered.map(arr => arr[0]);
	const faceMapBack = facesBackMapOrdered.map(arr => arr.slice().reverse()[0]);
	const front = makeOneSide(structuredClone(planar), faceMapFront);
	const back = makeOneSide(planar, faceMapBack);
	correctFaceWinding(front, faces_winding, faceMapFront);
	correctFaceWinding(back, faces_winding, faceMapBack);
	const faceOrders = front.faces_vertices
		.map((_, f) => (faces_winding[faceMapFront[f]]
			? [front.faces_vertices.length + f, f, -1]
			: [front.faces_vertices.length + f, f, 1]));
	join(front, back);
	return {
		...front,
		faceOrders,
		frame_classes: ["foldedForm"],
	}
};

export { fixCycles };

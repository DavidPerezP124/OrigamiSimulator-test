/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makePlanarFaces } from '../make/faces.js';
import { makeEdgesFacesUnsorted } from '../make/edgesFaces.js';
import { makeFacesEdgesFromVertices } from '../make/facesEdges.js';
import { invertArrayMap, invertFlatToArrayMap } from '../maps.js';

const makeFaceBackmapOld = (
	{ edges_vertices, edges_faces, faces_vertices, faces_edges },
	faces_edgesNew,
	edgesBackmap,
) => {
	if (!faces_vertices && !faces_edges) { return []; }
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	if (!edges_faces) {
		edges_faces = makeEdgesFacesUnsorted({ edges_vertices, faces_vertices, faces_edges });
	}
	const faces_backEdges = faces_edgesNew
		.map(edges => edges
			.filter(e => edgesBackmap[e] !== undefined)
			.map(e => edgesBackmap[e]));
	const faces_backEdges_faces = faces_backEdges
		.map(backEdges => backEdges.map(edges => edges.flatMap(e => edges_faces[e])));
	const faces_faceAppearanceCount = faces_backEdges_faces
		.map(edgesFaces => invertFlatToArrayMap(edgesFaces.flat())
			.map(el => el.length));
	const facesBackMap = faces_faceAppearanceCount
		.map(indexCounts => invertFlatToArrayMap(indexCounts))
		.map(faces => faces.pop())
		.map(res => (res === undefined ? [] : res));
	return facesBackMap;
};
const planarizeMakeFaces = (oldGraph, newGraph, { edges: { map: edgeNextMap } }) => {
	const edgeBackMap = invertArrayMap(edgeNextMap);
	const {
		faces_vertices,
		faces_edges,
	} = makePlanarFaces(newGraph);
	const faceBackMap = makeFaceBackmapOld(
		oldGraph,
		faces_edges,
		edgeBackMap,
	);
	return {
		faces_vertices,
		faces_edges,
		faceMap: invertArrayMap(faceBackMap),
	};
};

export { planarizeMakeFaces };

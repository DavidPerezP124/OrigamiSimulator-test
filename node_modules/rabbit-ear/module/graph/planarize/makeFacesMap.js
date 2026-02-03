/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { uniqueElements, chooseTwoPairs } from '../../general/array.js';
import { connectedComponents } from '../connectedComponents.js';
import { makeEdgesFacesUnsorted } from '../make/edgesFaces.js';
import { makeFacesEdgesFromVertices } from '../make/facesEdges.js';
import { makeFacesFaces } from '../make/facesFaces.js';
import { invertFlatToArrayMap, invertArrayMap } from '../maps.js';
import { minimumSpanningTrees } from '../trees.js';

const makeFacesMap = (
	oldGraph,
	newGraph,
	changes,
) => {
	if (!oldGraph.faces_vertices) { return []; }
	const faces_edgesNew = newGraph.faces_edges || makeFacesEdgesFromVertices(newGraph);
	const faces_facesNew = makeFacesFaces(newGraph)
		.map(arr => arr.filter(a => a !== null && a !== undefined));
	const edges_facesNew = makeEdgesFacesUnsorted(newGraph);
	const edges_facesOld = makeEdgesFacesUnsorted(oldGraph);
	const connectedFaces = connectedComponents(faces_facesNew);
	const facesGroups = invertFlatToArrayMap(connectedFaces);
	const edgesGroups = facesGroups
		.map(faces => faces.flatMap(f => faces_edgesNew[f]))
		.map(uniqueElements);
	const startEdges = edgesGroups
		.map(group => group.find(e => edges_facesNew[e].length === 1));
	const startFaces = startEdges
		.map(edge => edges_facesNew[edge][0]);
	const facesEdgeMap = {};
	edges_facesNew
		.forEach((faces, e) => chooseTwoPairs(faces)
			.forEach(pair => {
				facesEdgeMap[pair.join(" ")] = e;
				facesEdgeMap[pair.reverse().join(" ")] = e;
			}));
	const edgesBackmap = invertArrayMap(changes.edges.map);
	const faceBackMapSets = [];
	minimumSpanningTrees(faces_facesNew, startFaces)
		.forEach((tree, t) => {
			const rootRow = tree.shift();
			if (!rootRow || !rootRow.length) { return; }
			const root = rootRow[0];
			const startNewEdge = startEdges[t];
			const startOldEdges = edgesBackmap[startNewEdge];
			faceBackMapSets[root.index] = new Set(startOldEdges.flatMap(edge => edges_facesOld[edge]));
			tree.forEach(level => level.forEach(({ index, parent }) => {
				const edge = facesEdgeMap[`${index} ${parent}`];
				const oldEdges = edgesBackmap[edge];
				const oldFaces = oldEdges.flatMap(e => edges_facesOld[e]);
				const parentFaces = new Set(faceBackMapSets[parent]);
				oldFaces.forEach(f => (parentFaces.has(f) ? parentFaces.delete(f) : parentFaces.add(f)));
				faceBackMapSets[index] = parentFaces;
			}));
		});
	const faceBackMap = faceBackMapSets.map(set => Array.from(set));
	return invertArrayMap(faceBackMap);
};

export { makeFacesMap };

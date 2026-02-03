/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { makeFacesCenterQuick } from '../graph/make/faces.js';
import { getEdgesFacesOverlap, getEdgesEdgesCollinearOverlap } from '../graph/overlap.js';
import { connectedComponentsPairs } from '../graph/connectedComponents.js';
import { makeEdgesFacesSide, makeEdgePairsFacesSide } from './facesSide.js';

const classifyEdgePair = (edgePairFacesSide) => {
	const isTaco = edgePairFacesSide.map(([f0, f1]) => f0 === f1);
	if (isTaco[0] && isTaco[1]) {
		if (edgePairFacesSide[0][0] !== edgePairFacesSide[1][0]) { return 0; }
		return 1;
	}
	if (!isTaco[0] && !isTaco[1]) {
		return edgePairFacesSide[0][0] === edgePairFacesSide[1][0] ? 2 : 3;
	}
	const tacoSide = isTaco[0] ? edgePairFacesSide[0][0] : edgePairFacesSide[1][0];
	const tortillaFacesSide = isTaco[0] ? edgePairFacesSide[1] : edgePairFacesSide[0];
	const tortillaSideMatch = tacoSide === tortillaFacesSide[0] ? 0 : 1;
	const whichIsTaco = isTaco[0] ? 0 : 2;
	return 4 + whichIsTaco + tortillaSideMatch;
};
const formatTacoTortilla = ([faces0, faces1], classification) => {
	switch (classification) {
	case 4: return [faces0[0], faces1[0], faces0[1]];
	case 5: return [faces0[0], faces1[1], faces0[1]];
	case 6: return [faces1[0], faces0[0], faces1[1]];
	case 7: return [faces1[0], faces0[1], faces1[1]];
	default: return undefined;
	}
};
const formatTortillaTortilla = ([faces0, faces1], classification) => {
	switch (classification) {
	case 2: return [...faces0, ...faces1];
	case 3: return [...faces0, faces1[1], faces1[0]];
	default: return undefined;
	}
};
const makeTortillaTortillaFacesCrossing = (
	edges_faces,
	edgesFacesSide,
	edgesFacesOverlap,
) => {
	const tortilla_edge_indices = edgesFacesSide
		.map(side => side.length === 2 && side[0] !== side[1])
		.map((isTortilla, i) => (isTortilla ? i : undefined))
		.filter(a => a !== undefined);
	const tortillas_faces_crossing = [];
	tortilla_edge_indices.forEach(edge => {
		tortillas_faces_crossing[edge] = edgesFacesOverlap[edge];
	});
	return tortillas_faces_crossing
		.flatMap((faces, e) => faces
			.map(face => [...edges_faces[e], face, face]))
		.filter(arr => arr.length === 4)
		.map(arr => [arr[0], arr[1], arr[2], arr[3]]);
};
const makeTacosAndTortillas = ({
	vertices_coords, edges_vertices, edges_faces, faces_vertices, faces_edges,
	faces_center,
}, epsilon = EPSILON) => {
	if (!faces_center) {
		faces_center = makeFacesCenterQuick({ vertices_coords, faces_vertices });
	}
	const edgesFacesOverlap = getEdgesFacesOverlap({
		vertices_coords, edges_vertices, faces_vertices, faces_edges,
	}, epsilon);
	const edgesFacesSide = makeEdgesFacesSide({
		vertices_coords, edges_vertices, edges_faces, faces_center,
	});
	const edgePairs = connectedComponentsPairs(
		getEdgesEdgesCollinearOverlap({ vertices_coords, edges_vertices }, epsilon),
	).filter(pair => pair.every(edge => edges_faces[edge].length > 1));
	const edgePairsFacesSide = makeEdgePairsFacesSide({
		vertices_coords, edges_vertices, edges_faces, faces_center,
	}, edgePairs);
	const edgePairsFacesType = edgePairsFacesSide.map(classifyEdgePair);
	const tortillaTortillaCrossing = makeTortillaTortillaFacesCrossing(
		edges_faces,
		edgesFacesSide,
		edgesFacesOverlap,
	);
	const edgePairsFaces = edgePairs.map(edgePair => [
		[edges_faces[edgePair[0]][0], edges_faces[edgePair[0]][1]],
		[edges_faces[edgePair[1]][0], edges_faces[edgePair[1]][1]],
	]);
	const tacoTortillaCrossing = edgesFacesOverlap
		.map((faces, e) => (edgesFacesSide[e].length > 1
			&& edgesFacesSide[e][0] === edgesFacesSide[e][1]
			? faces
			: []))
		.map((tortillas, edge) => ({ taco: edges_faces[edge], tortillas }))
		.filter(({ tortillas }) => tortillas.length)
		.flatMap(({ taco: [a, b], tortillas }) => tortillas
			.map(tortilla => [a, tortilla, b]))
		.map(arr => [arr[0], arr[1], arr[2]]);
	const taco_taco = edgePairsFacesType
		.map((n, i) => (n === 1 ? i : undefined))
		.filter(a => a !== undefined)
		.map(i => edgePairs[i].map(edge => edges_faces[edge]))
		.map(el => [el[0][0], el[1][0], el[0][1], el[1][1]]);
	const taco_tortilla = edgePairsFacesType
		.map((n, i) => (n > 3 ? i : undefined))
		.filter(a => a !== undefined)
		.map(i => formatTacoTortilla(edgePairsFaces[i], edgePairsFacesType[i]))
		.concat(tacoTortillaCrossing);
	const tortilla_tortilla = edgePairsFacesType
		.map((n, i) => (n === 2 || n === 3 ? i : undefined))
		.filter(a => a !== undefined)
		.map(i => formatTortillaTortilla(edgePairsFaces[i], edgePairsFacesType[i]))
		.concat(tortillaTortillaCrossing);
	return {
		taco_taco,
		taco_tortilla,
		tortilla_tortilla,
	};
};

export { makeTacosAndTortillas, makeTortillaTortillaFacesCrossing };

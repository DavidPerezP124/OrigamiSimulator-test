/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { arrayArrayToLookupArray } from '../general/array.js';
import { connectedComponentsPairs } from '../graph/connectedComponents.js';
import { invertFlatToArrayMap } from '../graph/maps.js';
import { mergeWithoutOverwrite } from './general.js';
import { getFacesEdgesOverlap, getEdgesEdgesCollinearOverlap } from '../graph/overlap.js';

const getOverlapFacesWith3DEdge = (
	{ edges_faces },
	{ clusters_graph, faces_plane },
	epsilon = EPSILON,
) => {
	const edgesKeep = edges_faces.map(faces => faces.length === 2
		&& faces_plane[faces[0]] !== faces_plane[faces[1]]);
	const clusters_graphNoBoundary = clusters_graph
		.map(graph => ({
			vertices_coords: graph.vertices_coords,
			edges_vertices: graph.edges_vertices,
			faces_vertices: graph.faces_vertices,
			faces_edges: graph.faces_edges,
		}));
	const clustersFacesEdges = clusters_graphNoBoundary
		.map(graph => getFacesEdgesOverlap(graph, epsilon))
		.map(facesEdges => facesEdges
			.map(edges => edges.filter(edge => edgesKeep[edge])));
	const facesEdges3DInfo = clustersFacesEdges
		.flatMap(facesEdges => facesEdges
			.flatMap((edges, face) => edges
				.map(edge => ({
					edge,
					faces: edges_faces[edge],
					facesPlanes: edges_faces[edge].map(f => faces_plane[f]),
					tortilla: face,
					tortillaPlane: faces_plane[face],
				}))));
	return facesEdges3DInfo
		.map(({ edge, faces, facesPlanes, tortilla, tortillaPlane }) => ({
			edge,
			tortilla,
			coplanar: faces.filter((_, i) => facesPlanes[i] === tortillaPlane).shift(),
			angled: faces.filter((_, i) => facesPlanes[i] !== tortillaPlane).shift(),
		}));
};
const solveOverlapFacesWith3DEdge = (
	{ edges_foldAngle },
	edgeFace3DOverlaps,
	faces_winding,
) => {
	const facePairs = edgeFace3DOverlaps
		.map(({ tortilla, coplanar }) => [tortilla, coplanar]);
	const facePairsCorrectOrder = facePairs.map(([a, b]) => a < b);
	facePairs
		.map((_, i) => i)
		.filter(i => !facePairsCorrectOrder[i])
		.forEach(i => facePairs[i].reverse());
	const facePairKeys = facePairs.map(pair => pair.join(" "));
	const facePairLocalBendDirection = edgeFace3DOverlaps
		.map(({ edge }) => edges_foldAngle[edge])
		.map(Math.sign)
		.map(n => n === 1);
	const facePairsAligned = edgeFace3DOverlaps
		.map(({ coplanar }) => faces_winding[coplanar]);
	const facePairGlobalBendDirection = facePairLocalBendDirection
		.map((dir, i) => !(dir !== facePairsAligned[i]));
	const facePairSolution = facePairGlobalBendDirection
		.map(bool => (bool ? 1 : 0))
		.map((result, i) => (facePairsCorrectOrder[i] ? result : 1 - result))
		.map(result => result + 1);
	return mergeWithoutOverwrite(facePairKeys
		.map((key, i) => ({ [key]: facePairSolution[i] })));
};
const solveFacePair3D = ({ edges_foldAngle, faces_winding }, edges, faces) => {
	const facesAligned = faces.map(face => faces_winding[face]);
	const edgesFoldAngleAligned = edges
		.map(edge => edges_foldAngle[edge])
		.map((angle, i) => (facesAligned[i] ? angle : -angle));
	const indicesInOrder = edgesFoldAngleAligned[0] > edgesFoldAngleAligned[1];
	const facesInOrder = faces[0] < faces[1];
	const orderValue = (indicesInOrder !== facesInOrder) ? 2 : 1;
	const faceKey = (facesInOrder
		? faces.join(" ")
		: [faces[1], faces[0]].join(" "));
	return { [faceKey]: orderValue };
};
const getEdgesAngleClass = ({ edges_faces, faces_plane, facesFacesLookup }) => {
	const edges_angleClass = [];
	const degreeTwoEdges = edges_faces
		.map((_, edge) => edge)
		.filter(edge => edges_faces[edge].length === 2);
	degreeTwoEdges
		.filter(e => faces_plane[edges_faces[e][0]] === faces_plane[edges_faces[e][1]])
		.forEach(edge => {
			const [f0, f1] = edges_faces[edge];
			edges_angleClass[edge] = facesFacesLookup[f0][f1] ? 2 : 1;
		});
	degreeTwoEdges
		.filter(e => faces_plane[edges_faces[e][0]] !== faces_plane[edges_faces[e][1]])
		.forEach(edge => { edges_angleClass[edge] = 0; });
	return edges_angleClass;
};
const classifyEdgePair = ({ faces, planes, angleClasses }, facesFacesLookup) => {
	const [c0, c1] = angleClasses;
	const [f0, f1, f2, f3] = faces;
	const [p0, p1, p2, p3] = planes;
	if (c0 && c1) { return 0; }
	const interPairOverlap = facesFacesLookup[f0][f2]
		|| facesFacesLookup[f0][f3]
		|| facesFacesLookup[f1][f2]
		|| facesFacesLookup[f1][f3];
	if (!interPairOverlap) { return 0; }
	if (c0 === 1 || c1 === 1) { return 3; }
	if (c0 === 2 || c1 === 2) { return 5; }
	if ((p0 === p2 && p1 !== p3 && facesFacesLookup[f0][f2])
		|| (p0 === p3 && p1 !== p2 && facesFacesLookup[f0][f3])
		|| (p1 === p2 && p0 !== p3 && facesFacesLookup[f1][f2])
		|| (p1 === p3 && p0 !== p2 && facesFacesLookup[f1][f3])) {
		return 2;
	}
	if ((p0 === p2 && p1 === p3 && facesFacesLookup[f0][f2] && !facesFacesLookup[f1][f3])
		|| (p0 === p3 && p1 === p2 && facesFacesLookup[f0][f3] && !facesFacesLookup[f1][f2])
		|| (p1 === p2 && p0 === p3 && facesFacesLookup[f1][f2] && !facesFacesLookup[f0][f3])
		|| (p1 === p3 && p0 === p2 && facesFacesLookup[f1][f3] && !facesFacesLookup[f0][f2])) {
		return 1;
	}
	if ((p0 === p2 && p1 === p3 && facesFacesLookup[f0][f2] && facesFacesLookup[f1][f3])
		|| (p0 === p3 && p1 === p2 && facesFacesLookup[f0][f3] && facesFacesLookup[f1][f2])
		|| (p1 === p2 && p0 === p3 && facesFacesLookup[f1][f2] && facesFacesLookup[f0][f3])
		|| (p1 === p3 && p0 === p2 && facesFacesLookup[f1][f3] && facesFacesLookup[f0][f2])) {
		return 4;
	}
	return 6;
};
const getSolvable3DEdgePairs = ({
	edges_faces,
	faces_plane,
	edgePairs,
	facesFacesLookup,
}) => {
	const edges_angleClass = getEdgesAngleClass({
		edges_faces, faces_plane, facesFacesLookup,
	});
	const edgePairsClassInfo = edgePairs.map(edges => ({
		faces: edges.flatMap(e => edges_faces[e]),
		planes: edges.flatMap(e => edges_faces[e].map(face => faces_plane[face])),
		angleClasses: edges.map(edge => edges_angleClass[edge]),
	})).map(({ faces, planes, angleClasses }) => ({
		faces: [faces[0], faces[1], faces[2], faces[3]],
		planes: [planes[0], planes[1], planes[2], planes[3]],
		angleClasses: [angleClasses[0], angleClasses[1]],
	}));
	const edgePairsClass = edgePairsClassInfo
		.map(info => classifyEdgePair(info, facesFacesLookup));
	const [
		,
		tJunctions,
		yJunctions,
		bentFlatTortillas,
		bentTortillas,
		bentTortillasFlatTaco,
		uncaught,
	] = invertFlatToArrayMap(edgePairsClass);
	if (uncaught && uncaught.length) {
		console.warn("getSolvable3DEdgePairs uncaught edge pairs");
	}
	return {
		tJunctions: (tJunctions || []),
		yJunctions: (yJunctions || []),
		bentFlatTortillas: (bentFlatTortillas || []),
		bentTortillas: (bentTortillas || []),
		bentTortillasFlatTaco: (bentTortillasFlatTaco || []),
	};
};
const constraints3DEdges = ({
	vertices_coords,
	edges_vertices,
	edges_faces,
	edges_foldAngle,
}, {
	faces_plane,
	faces_winding,
	facesFacesOverlap,
}, epsilon = EPSILON) => {
	const edges_vertices2 = edges_vertices.slice();
	edges_faces
		.map((_, e) => e)
		.filter(e => edges_faces[e].length !== 2)
		.forEach(e => delete edges_vertices2[e]);
	const edgesEdgesOverlap = getEdgesEdgesCollinearOverlap({
		vertices_coords, edges_vertices: edges_vertices2,
	}, epsilon);
	const edgePairs = connectedComponentsPairs(edgesEdgesOverlap);
	const facesFacesLookup = arrayArrayToLookupArray(facesFacesOverlap);
	const {
		tJunctions,
		yJunctions,
		bentFlatTortillas,
		bentTortillas,
		bentTortillasFlatTaco,
	} = getSolvable3DEdgePairs({
		edges_faces,
		faces_plane,
		edgePairs,
		facesFacesLookup,
	});
	const solveYTJunction = (edges) => {
		const [f0, f1, f2, f3] = edges.flatMap(e => edges_faces[e]);
		const faces = [[f0, f2], [f0, f3], [f1, f2], [f1, f3]]
			.filter(([a, b]) => facesFacesLookup[a][b])
			.shift();
		if (!faces) { return undefined; }
		return solveFacePair3D({ edges_foldAngle, faces_winding }, edges, faces);
	};
	const makeBentTortillaFlatTaco = (edges) => {
		const [f0, f1, f2, f3] = edges.flatMap(e => edges_faces[e]);
		const result = [[f0, f2, f1], [f2, f1, f3], [f2, f0, f3], [f0, f3, f1]]
			.filter(([a, b, c]) => facesFacesLookup[a][b] && facesFacesLookup[a][c])
			.shift();
		return result ? [result[0], result[1], result[2]] : undefined;
	};
	const makeBentTortillas = (edges) => {
		const faces = edges.flatMap(edge => edges_faces[edge]);
		const tortillas = [faces[0], faces[1], faces[2], faces[3]];
		if (faces_plane[tortillas[0]] !== faces_plane[tortillas[2]]) {
			[tortillas[2], tortillas[3]] = [tortillas[3], tortillas[2]];
		}
		if (faces_winding[tortillas[0]] !== faces_winding[tortillas[1]]) {
			[tortillas[1], tortillas[3]] = [tortillas[3], tortillas[1]];
		}
		return tortillas;
	};
	const tortilla_tortilla = bentTortillas
		.map(i => edgePairs[i])
		.map(makeBentTortillas);
	const taco_tortilla = bentTortillasFlatTaco
		.map(i => edgePairs[i])
		.map(makeBentTortillaFlatTaco)
		.filter(a => a !== undefined);
	const arrayOfOrders = [...tJunctions, ...yJunctions, ...bentFlatTortillas]
		.map(i => edgePairs[i])
		.map(solveYTJunction);
	const orders = mergeWithoutOverwrite(arrayOfOrders);
	return {
		orders,
		tortilla_tortilla,
		taco_tortilla,
	};
};

export { constraints3DEdges, getOverlapFacesWith3DEdge, getSolvable3DEdgePairs, solveFacePair3D, solveOverlapFacesWith3DEdge };

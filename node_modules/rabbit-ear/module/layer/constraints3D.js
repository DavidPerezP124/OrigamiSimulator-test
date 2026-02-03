/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../environment/messages.js';
import { EPSILON } from '../math/constant.js';
import { edgeFoldAngleIsFlat } from '../fold/spec.js';
import { constraints3DFaceClusters } from './constraints3DFaces.js';
import { constraints3DEdges, getOverlapFacesWith3DEdge, solveOverlapFacesWith3DEdge } from './constraints3DEdges.js';
import { makeTacosAndTortillas } from './tacosTortillas.js';
import { getTransitivityTriosFromTacos, makeTransitivity } from './transitivity.js';
import { makeConstraintsLookup } from './constraintsFlat.js';
import { solveFlatAdjacentEdges } from './initialSolutionsFlat.js';
import { mergeWithoutOverwrite } from './general.js';

const makeSolverConstraints3D = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment, edges_foldAngle,
	faces_vertices, faces_edges, faces_faces,
}, epsilon = EPSILON) => {
	const {
		faces_plane,
		faces_winding,
		faces_polygon,
		clusters_graph,
		facesFacesOverlap,
		facePairs,
	} = constraints3DFaceClusters({
		vertices_coords,
		edges_vertices,
		edges_faces,
		edges_assignment,
		edges_foldAngle,
		faces_vertices,
		faces_edges,
		faces_faces,
	}, epsilon);
	let edgeResults;
	try {
		edgeResults = constraints3DEdges({
			vertices_coords,
			edges_vertices,
			edges_faces,
			edges_foldAngle,
		}, {
			faces_plane,
			faces_winding,
			facesFacesOverlap,
		}, epsilon);
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	const {
		orders: orders3D,
		tortilla_tortilla: tortilla_tortilla3D,
		taco_tortilla: taco_tortilla3D,
	} = edgeResults;
	const nonFlatEdges = edges_foldAngle
		.map(edgeFoldAngleIsFlat)
		.map((flat, i) => (!flat ? i : undefined))
		.filter(a => a !== undefined);
	["edges_vertices", "edges_faces", "edges_assignment", "edges_foldAngle"]
		.forEach(key => clusters_graph
			.forEach((_, c) => nonFlatEdges
				.forEach(e => delete clusters_graph[c][key][e])));
	const clusters_TacosAndTortillas = clusters_graph
		.map(el => makeTacosAndTortillas(el, epsilon));
	const taco_taco = clusters_TacosAndTortillas
		.flatMap(el => el.taco_taco);
	const taco_tortilla = clusters_TacosAndTortillas
		.flatMap(el => el.taco_tortilla);
	const tortilla_tortilla = clusters_TacosAndTortillas
		.flatMap(el => el.tortilla_tortilla);
	const tacosTrios = getTransitivityTriosFromTacos({ taco_taco, taco_tortilla });
	const transitivity = makeTransitivity({ faces_polygon }, facesFacesOverlap, epsilon)
		.filter(trio => tacosTrios[trio.join(" ")] === undefined);
	taco_tortilla.push(...taco_tortilla3D);
	tortilla_tortilla.push(...tortilla_tortilla3D);
	const lookup = makeConstraintsLookup({
		taco_taco,
		taco_tortilla,
		tortilla_tortilla,
		transitivity,
	});
	const adjacentOrders = clusters_graph
		.map(el => solveFlatAdjacentEdges(el, faces_winding))
		.reduce((a, b) => Object.assign(a, b), ({}));
	const edgeFace3DOverlaps = getOverlapFacesWith3DEdge(
		{ edges_faces },
		{ clusters_graph, faces_plane },
		epsilon,
	);
	let orders3DEdgeFace;
	try {
		orders3DEdgeFace = solveOverlapFacesWith3DEdge(
			{ edges_foldAngle },
			edgeFace3DOverlaps,
			faces_winding,
		);
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	let orders;
	try {
		orders = mergeWithoutOverwrite([
			orders3D,
			adjacentOrders,
			orders3DEdgeFace,
		]);
	} catch (error) {
		throw new Error(Messages.noLayerSolution, { cause: error });
	}
	return {
		constraints: {
			taco_taco,
			taco_tortilla,
			tortilla_tortilla,
			transitivity,
		},
		lookup,
		facePairs,
		faces_winding,
		orders,
	};
};

export { makeSolverConstraints3D };

/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { connectedComponentsPairs } from '../graph/connectedComponents.js';
import { getFacesFacesOverlap } from '../graph/overlap.js';
import { makeFacesWinding } from '../graph/faces/winding.js';
import { makeFacesPolygon } from '../graph/make/faces.js';
import { solveFlatAdjacentEdges } from './initialSolutionsFlat.js';
import { tacoTypeNames, constraintToFacePairsStrings, emptyCategoryObject } from './general.js';
import { makeTacosAndTortillas } from './tacosTortillas.js';
import { getTransitivityTriosFromTacos, makeTransitivity } from './transitivity.js';

const makeConstraintsLookup = (constraints) => {
	const lookup = emptyCategoryObject();
	tacoTypeNames.forEach(key => { lookup[key] = {}; });
	tacoTypeNames
		.forEach(type => constraints[type]
			.forEach(constraint => constraintToFacePairsStrings[type](constraint)
				.forEach(key => { lookup[type][key] = []; })));
	tacoTypeNames
		.forEach(type => constraints[type]
			.forEach((constraint, i) => constraintToFacePairsStrings[type](constraint)
				.forEach(key => lookup[type][key].push(i))));
	return lookup;
};
const makeSolverConstraintsFlat = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment,
	faces_vertices, faces_edges, faces_center,
}, epsilon = EPSILON) => {
	const faces_winding = makeFacesWinding({ vertices_coords, faces_vertices });
	const faces_polygon = makeFacesPolygon({ vertices_coords, faces_vertices }, epsilon);
	faces_winding
		.map((upright, i) => (upright ? undefined : i))
		.filter(a => a !== undefined)
		.forEach(f => faces_polygon[f].reverse());
	const faces_facesOverlap = getFacesFacesOverlap({
		vertices_coords, faces_vertices,
	}, epsilon);
	const {
		taco_taco, taco_tortilla, tortilla_tortilla,
	} = makeTacosAndTortillas({
		vertices_coords,
		edges_vertices,
		edges_faces,
		faces_vertices,
		faces_edges,
		faces_center,
	}, epsilon);
	const tacosTrios = getTransitivityTriosFromTacos({ taco_taco, taco_tortilla });
	const transitivity = makeTransitivity({ faces_polygon }, faces_facesOverlap, epsilon)
		.filter(trio => tacosTrios[trio.join(" ")] === undefined);
	const facePairs = connectedComponentsPairs(faces_facesOverlap)
		.map(pair => pair.join(" "));
	const lookup = makeConstraintsLookup({
		taco_taco,
		taco_tortilla,
		tortilla_tortilla,
		transitivity,
	});
	const orders = solveFlatAdjacentEdges({
		edges_faces,
		edges_assignment,
	}, faces_winding);
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

export { makeConstraintsLookup, makeSolverConstraintsFlat };

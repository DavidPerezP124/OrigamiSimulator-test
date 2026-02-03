/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { clipPolygonPolygon } from '../math/clip.js';

const makeTransitivity = (
	{ faces_polygon },
	facesFacesOverlap,
	epsilon = EPSILON,
) => {
	const overlap_matrix = facesFacesOverlap.map(() => ({}));
	facesFacesOverlap.forEach((faces, i) => faces.forEach(j => {
		overlap_matrix[i][j] = true;
		overlap_matrix[j][i] = true;
	}));
	const facesFacesIntersection = [];
	facesFacesOverlap.forEach((faces, i) => faces.forEach(j => {
		const polygon = clipPolygonPolygon(faces_polygon[i], faces_polygon[j], epsilon);
		if (polygon) {
			if (!facesFacesIntersection[i]) { facesFacesIntersection[i] = []; }
			if (!facesFacesIntersection[j]) { facesFacesIntersection[j] = []; }
			facesFacesIntersection[i][j] = polygon;
			facesFacesIntersection[j][i] = polygon;
		}
	}));
	const trios = [];
	for (let i = 0; i < facesFacesIntersection.length - 1; i += 1) {
		if (!facesFacesIntersection[i]) { continue; }
		for (let j = i + 1; j < facesFacesIntersection.length; j += 1) {
			if (!facesFacesIntersection[i][j]) { continue; }
			for (let k = j + 1; k < facesFacesIntersection.length; k += 1) {
				if (i === k || j === k) { continue; }
				if (!overlap_matrix[i][k] || !overlap_matrix[j][k]) { continue; }
				const polygon = clipPolygonPolygon(
					facesFacesIntersection[i][j],
					faces_polygon[k],
					epsilon,
				);
				if (polygon) {
					const [t, u, v] = [i, j, k].sort((a, b) => a - b);
					trios.push([t, u, v]);
				}
			}
		}
	}
	return trios;
};
const getTransitivityTriosFromTacos = ({ taco_taco, taco_tortilla }) => {
	const tacoTacoTrios = taco_taco
		.map(arr => arr.slice().sort((a, b) => a - b))
		.flatMap(([t0, t1, t2, t3]) => [
			[t0, t1, t2],
			[t0, t1, t3],
			[t0, t2, t3],
			[t1, t2, t3],
		]);
	const tacoTortillaTrios = taco_tortilla
		.map(arr => arr.slice().sort((a, b) => a - b));
	const tacos_trios = {};
	tacoTacoTrios
		.concat(tacoTortillaTrios)
		.map(faces => faces.join(" "))
		.forEach(key => { tacos_trios[key] = true; });
	return tacos_trios;
};

export { getTransitivityTriosFromTacos, makeTransitivity };

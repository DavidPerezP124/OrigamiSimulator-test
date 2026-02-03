/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { include, includeL, includeS } from '../math/compare.js';
import { subtract2, rotate90 } from '../math/vector.js';
import { makeMatrix2Reflect, multiplyMatrix2Vector2 } from '../math/matrix2.js';
import { overlapConvexPolygonPoint, overlapLinePoint } from '../math/overlap.js';
import { intersectLineLine, intersectPolygonLine } from '../math/intersect.js';
import { clipLineConvexPolygon } from '../math/clip.js';

const reflectPoint = (foldLine, point) => {
	const matrix = makeMatrix2Reflect(foldLine.vector, foldLine.origin);
	return multiplyMatrix2Vector2(matrix, point);
};
const validateAxiom1And2 = (boundary, point1, point2) => [
	[point1, point2]
		.map(p => overlapConvexPolygonPoint(boundary, p, include).overlap)
		.reduce((a, b) => a && b, true),
];
const validateAxiom3 = (boundary, solutions, line1, line2) => {
	const segments = [line1, line2]
		.map(line => clipLineConvexPolygon(
			boundary,
			line,
			include,
			includeL,
		));
	if (segments[0] === undefined || segments[1] === undefined) {
		return [false, false];
	}
	const results_clip = solutions.map(line => (line === undefined
		? undefined
		: clipLineConvexPolygon(
			boundary,
			line,
			include,
			includeL,
		)));
	const results_inside = [0, 1].map((i) => results_clip[i] !== undefined);
	const seg0Reflect = solutions.map(foldLine => (foldLine === undefined
		? undefined
		: [
			reflectPoint(foldLine, segments[0][0]),
			reflectPoint(foldLine, segments[0][1]),
		]));
	const reflectMatch = seg0Reflect.map(seg => (seg === undefined
		? false
		: (overlapLinePoint(
			{ vector: subtract2(segments[1][1], segments[1][0]), origin: segments[1][0] },
			seg[0],
			includeS,
		)
		|| overlapLinePoint(
			{ vector: subtract2(segments[1][1], segments[1][0]), origin: segments[1][0] },
			seg[1],
			includeS,
		)
		|| overlapLinePoint(
			{ vector: subtract2(seg[1], seg[0]), origin: seg[0] },
			segments[1][0],
			includeS,
		)
		|| overlapLinePoint(
			{ vector: subtract2(seg[1], seg[0]), origin: seg[0] },
			segments[1][1],
			includeS,
		))));
	return [0, 1].map(i => reflectMatch[i] === true && results_inside[i] === true);
};
const validateAxiom4 = (boundary, solutions, line, point) => {
	const perpendicular = { vector: rotate90(line.vector), origin: point };
	const intersect = intersectLineLine(line, perpendicular).point;
	if (!intersect) { return [false]; }
	return [
		[point, intersect]
			.map(p => overlapConvexPolygonPoint(boundary, p, include).overlap)
			.reduce((a, b) => a && b, true),
	];
};
const validateAxiom5 = (boundary, solutions, line, point1, point2) => {
	if (solutions.length === 0) { return []; }
	const testParamPoints = [point1, point2]
		.map(point => overlapConvexPolygonPoint(boundary, point, include).overlap)
		.reduce((a, b) => a && b, true);
	const testReflections = solutions
		.map(foldLine => reflectPoint(foldLine, point2))
		.map(point => overlapConvexPolygonPoint(boundary, point, include).overlap);
	return testReflections.map(ref => ref && testParamPoints);
};
const validateAxiom6 = function (boundary, solutions, line1, line2, point1, point2) {
	if (solutions.length === 0) { return []; }
	const testParamPoints = [point1, point2]
		.map(point => overlapConvexPolygonPoint(boundary, point, include).overlap)
		.reduce((a, b) => a && b, true);
	if (!testParamPoints) { return solutions.map(() => false); }
	const testReflect0 = solutions
		.map(foldLine => reflectPoint(foldLine, point1))
		.map(point => overlapConvexPolygonPoint(boundary, point, include).overlap);
	const testReflect1 = solutions
		.map(foldLine => reflectPoint(foldLine, point2))
		.map(point => overlapConvexPolygonPoint(boundary, point, include).overlap);
	return solutions.map((_, i) => testReflect0[i] && testReflect1[i]);
};
const validateAxiom7 = (boundary, solutions, line1, line2, point) => {
	const paramPointTest = overlapConvexPolygonPoint(
		boundary,
		point,
		include,
	).overlap;
	if (!solutions.length) { return [false]; }
	const reflected = reflectPoint(solutions[0], point);
	const reflectTest = overlapConvexPolygonPoint(boundary, reflected, include).overlap;
	const paramLineTest = (
		intersectPolygonLine(boundary, line2, includeL).length >= 2
	);
	const intersect = intersectLineLine(
		line2,
		solutions[0],
		includeL,
		includeL,
	).point;
	const intersectInsideTest = intersect
		? overlapConvexPolygonPoint(boundary, intersect, include).overlap
		: false;
	return [paramPointTest && reflectTest && paramLineTest && intersectInsideTest];
};

export { validateAxiom1And2, validateAxiom3, validateAxiom4, validateAxiom5, validateAxiom6, validateAxiom7 };

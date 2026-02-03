/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { vecLineToUniqueLine, uniqueLineToVecLine } from '../math/convert.js';
import { includeL } from '../math/compare.js';
import { normalize2, rotate90, subtract2, dot2, add2, midpoint2, cross2, distance2, scale2 } from '../math/vector.js';
import { bisectLines2 } from '../math/line.js';
import { intersectCircleLine, intersectLineLine } from '../math/intersect.js';
import { polynomialSolver } from '../math/polynomial.js';

const normalAxiom1 = (point1, point2) => {
	const normal = normalize2(rotate90(subtract2(point2, point1)));
	return [{
		normal,
		distance: dot2(add2(point1, point2), normal) / 2.0,
	}];
};
const axiom1 = (point1, point2) => [{
	vector: normalize2(subtract2(point2, point1)),
	origin: point1,
}];
const normalAxiom2 = (point1, point2) => {
	const normal = normalize2(subtract2(point2, point1));
	return [{
		normal,
		distance: dot2(add2(point1, point2), normal) / 2.0,
	}];
};
const axiom2 = (point1, point2) => [{
	vector: normalize2(rotate90(subtract2(point2, point1))),
	origin: midpoint2(point1, point2),
}];
const normalAxiom3 = (line1, line2) => {
	const determ = cross2(line1.normal, line2.normal);
	if (Math.abs(determ) < EPSILON) {
		return [{
			normal: line1.normal,
			distance: (line1.distance + line2.distance * dot2(line1.normal, line2.normal)) / 2,
		}];
	}
	const x = line1.distance * line2.normal[1] - line2.distance * line1.normal[1];
	const y = line2.distance * line1.normal[0] - line1.distance * line2.normal[0];
	const intersect = [x / determ, y / determ];
	const [resultA, resultB] = [add2, subtract2]
		.map(f => normalize2(f(line1.normal, line2.normal)))
		.map(normal => ({ normal, distance: dot2(intersect, normal) }));
	return [resultA, resultB];
};
const axiom3 = (line1, line2) => bisectLines2(line1, line2);
const normalAxiom4 = (line, point) => {
	const normal = rotate90(line.normal);
	const distance = dot2(point, normal);
	return [{ normal, distance }];
};
const axiom4 = ({ vector }, point) => [{
	vector: rotate90(normalize2(vector)),
	origin: point,
}];
const normalAxiom5 = (line, point1, point2) => {
	const p1base = dot2(point1, line.normal);
	const a = line.distance - p1base;
	const c = distance2(point1, point2);
	if (a > c) { return []; }
	const b = Math.sqrt(c * c - a * a);
	const a_vec = scale2(line.normal, a);
	const base_center = add2(point1, a_vec);
	const base_vector = scale2(rotate90(line.normal), b);
	const mirrors = b < EPSILON
		? [base_center]
		: [add2(base_center, base_vector), subtract2(base_center, base_vector)];
	const [resultA, resultB] = mirrors
		.map(pt => normalize2(subtract2(point2, pt)))
		.map(normal => ({ normal, distance: dot2(point1, normal) }));
	return [resultA, resultB];
};
const axiom5 = (line, point1, point2) => (
	intersectCircleLine(
		{ radius: distance2(point1, point2), origin: point1 },
		line,
	) || []).map(sect => ({
	vector: normalize2(rotate90(subtract2(sect, point2))),
	origin: midpoint2(point2, sect),
}));
const normalAxiom6 = (line1, line2, point1, point2) => {
	if (Math.abs(1 - (dot2(line1.normal, point1) / line1.distance)) < 0.02) { return []; }
	const line_vec = rotate90(line1.normal);
	const vec1 = subtract2(
		add2(point1, scale2(line1.normal, line1.distance)),
		scale2(point2, 2),
	);
	const vec2 = subtract2(scale2(line1.normal, line1.distance), point1);
	const c1 = dot2(point2, line2.normal) - line2.distance;
	const c2 = 2 * dot2(vec2, line_vec);
	const c3 = dot2(vec2, vec2);
	const c4 = dot2(add2(vec1, vec2), line_vec);
	const c5 = dot2(vec1, vec2);
	const c6 = dot2(line_vec, line2.normal);
	const c7 = dot2(vec2, line2.normal);
	const d = c6;
	const c = c1 + c4 * c6 + c7;
	const b = c1 * c2 + c5 * c6 + c4 * c7;
	const a = c1 * c3 + c5 * c7;
	let coefficients = [];
	if (Math.abs(d) > EPSILON) {
		coefficients = [a, b, c, d];
	} else if (Math.abs(c) > EPSILON) {
		coefficients = [a, b, c];
	} else if (Math.abs(b) > EPSILON) {
		coefficients = [a, b];
	}
	return polynomialSolver(coefficients)
		.map(n => add2(
			scale2(line1.normal, line1.distance),
			scale2(line_vec, n),
		))
		.map(p => ({ p, normal: normalize2(subtract2(p, point1)) }))
		.map(el => ({
			normal: el.normal,
			distance: dot2(el.normal, midpoint2(el.p, point1)),
		}));
};
const axiom6 = (line1, line2, point1, point2) => normalAxiom6(
	vecLineToUniqueLine(line1),
	vecLineToUniqueLine(line2),
	point1,
	point2,
).map(uniqueLineToVecLine);
const normalAxiom7 = (line1, line2, point) => {
	const normal = rotate90(line1.normal);
	const norm_norm = dot2(normal, line2.normal);
	if (Math.abs(norm_norm) < EPSILON) { return undefined; }
	const a = dot2(point, normal);
	const b = dot2(point, line2.normal);
	const distance = (line2.distance + 2.0 * a * norm_norm - b) / (2.0 * norm_norm);
	return [{ normal, distance }];
};
const axiom7 = (line1, line2, point) => {
	const intersect = intersectLineLine(
		line1,
		{ vector: line2.vector, origin: point },
		includeL,
		includeL,
	).point;
	return intersect === undefined
		? []
		: [{
			vector: normalize2(rotate90(subtract2(intersect, point))),
			origin: midpoint2(point, intersect),
		}];
};

export { axiom1, axiom2, axiom3, axiom4, axiom5, axiom6, axiom7, normalAxiom1, normalAxiom2, normalAxiom3, normalAxiom4, normalAxiom5, normalAxiom6, normalAxiom7 };

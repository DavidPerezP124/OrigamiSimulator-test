/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { includeL, include, includeS, epsilonEqual } from './compare.js';
import { cross2, normalize2, magnitude2, add2, scale2, rotate90, subtract2, resize2 } from './vector.js';
import { clusterSortedGeneric } from '../general/cluster.js';

const intersectLineLine = (
	a,
	b,
	aDomain = includeL,
	bDomain = includeL,
	epsilon = EPSILON,
) => {
	const det_norm = cross2(normalize2(a.vector), normalize2(b.vector));
	if (Math.abs(det_norm) < epsilon) {
		return { a: undefined, b: undefined, point: undefined };
	}
	const determinant0 = cross2(a.vector, b.vector);
	const determinant1 = -determinant0;
	const a2b = [b.origin[0] - a.origin[0], b.origin[1] - a.origin[1]];
	const b2a = [-a2b[0], -a2b[1]];
	const t0 = cross2(a2b, b.vector) / determinant0;
	const t1 = cross2(b2a, a.vector) / determinant1;
	if (aDomain(t0, epsilon / magnitude2(a.vector))
		&& bDomain(t1, epsilon / magnitude2(b.vector))) {
		return { a: t0, b: t1, point: add2(a.origin, scale2(a.vector, t0)) };
	}
	return { a: undefined, b: undefined, point: undefined };
};
const intersectCircleLine = (
	circle,
	line,
	_ = include,
	lineDomain = includeL,
	epsilon = EPSILON,
) => {
	const magSq = line.vector[0] ** 2 + line.vector[1] ** 2;
	const mag = Math.sqrt(magSq);
	const norm = mag === 0 ? line.vector : scale2(line.vector, 1 / mag);
	const rot90 = rotate90(norm);
	const bvec = subtract2(line.origin, circle.origin);
	const det = cross2(bvec, norm);
	if (Math.abs(det) > circle.radius + epsilon) { return undefined; }
	const side = Math.sqrt((circle.radius ** 2) - (det ** 2));
	const f = (s, i) => circle.origin[i] - rot90[i] * det + norm[i] * s;
	const results = Math.abs(circle.radius - Math.abs(det)) < epsilon
		? [side].map((s) => [f(s, 0), f(s, 1)])
		: [-side, side].map((s) => [f(s, 0), f(s, 1)]);
	const ts = results.map(res => res.map((n, i) => n - line.origin[i]))
		.map(v => v[0] * line.vector[0] + line.vector[1] * v[1])
		.map(d => d / magSq);
	return results.filter((__, i) => lineDomain(ts[i], epsilon));
};
const intersectPolygonLine = (
	polygon,
	line,
	domainFunc = includeL,
	epsilon = EPSILON,
) => {
	const intersections = polygon
		.map((p, i, arr) => ({
			vector: subtract2(arr[(i + 1) % arr.length], p),
			origin: resize2(p),
		}))
		.map(sideLine => intersectLineLine(
			line,
			sideLine,
			domainFunc,
			includeS,
			epsilon,
		))
		.filter(({ point }) => point !== undefined)
		.sort((m, n) => m.a - n.a)
		.map(({ a, point }) => ({ a, point }));
	const compare = (m, n) => epsilonEqual(m.a, n.a, epsilon);
	return clusterSortedGeneric(intersections, compare)
		.map(([i0]) => intersections[i0]);
};

export { intersectCircleLine, intersectLineLine, intersectPolygonLine };

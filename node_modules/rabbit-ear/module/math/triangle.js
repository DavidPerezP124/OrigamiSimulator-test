/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { scale2, distance2, subtract2, dot2, magnitude2, add2, scale3, distance3, subtract3, dot3, magnitude3, add3 } from './vector.js';

const trilateration2 = (pts, radii) => {
	if (pts[0] === undefined || pts[1] === undefined || pts[2] === undefined) {
		return undefined;
	}
	const ex = scale2(subtract2(pts[1], pts[0]), 1 / distance2(pts[1], pts[0]));
	const i = dot2(ex, subtract2(pts[2], pts[0]));
	const exi = scale2(ex, i);
	const p2p0exi = subtract2(subtract2(pts[2], pts[0]), exi);
	const ey = scale2(p2p0exi, (1 / magnitude2(p2p0exi)));
	const d = distance2(pts[1], pts[0]);
	const j = dot2(ey, subtract2(pts[2], pts[0]));
	const x = ((radii[0] ** 2) - (radii[1] ** 2) + (d ** 2)) / (2 * d);
	const y = ((radii[0] ** 2) - (radii[2] ** 2) + (i ** 2) + (j ** 2)) / (2 * j) - ((i * x) / j);
	return add2(add2(pts[0], scale2(ex, x)), scale2(ey, y));
};
const trilateration3 = (pts, radii) => {
	if (pts[0] === undefined || pts[1] === undefined || pts[2] === undefined) {
		return undefined;
	}
	const ex = scale3(subtract3(pts[1], pts[0]), 1 / distance3(pts[1], pts[0]));
	const i = dot3(ex, subtract3(pts[2], pts[0]));
	const exi = scale3(ex, i);
	const p2p0exi = subtract3(subtract3(pts[2], pts[0]), exi);
	const ey = scale3(p2p0exi, (1 / magnitude3(p2p0exi)));
	const d = distance3(pts[1], pts[0]);
	const j = dot3(ey, subtract3(pts[2], pts[0]));
	const x = ((radii[0] ** 2) - (radii[1] ** 2) + (d ** 2)) / (2 * d);
	const y = ((radii[0] ** 2) - (radii[2] ** 2) + (i ** 2) + (j ** 2)) / (2 * j) - ((i * x) / j);
	return add3(add3(pts[0], scale3(ex, x)), scale3(ey, y));
};
const circumcircle = (a, b, c) => {
	const A = b[0] - a[0];
	const B = b[1] - a[1];
	const C = c[0] - a[0];
	const D = c[1] - a[1];
	const E = A * (a[0] + b[0]) + B * (a[1] + b[1]);
	const F = C * (a[0] + c[0]) + D * (a[1] + c[1]);
	const G = 2 * (A * (c[1] - b[1]) - B * (c[0] - b[0]));
	if (Math.abs(G) < EPSILON) {
		const minx = Math.min(a[0], b[0], c[0]);
		const miny = Math.min(a[1], b[1], c[1]);
		const dx = (Math.max(a[0], b[0], c[0]) - minx) * 0.5;
		const dy = (Math.max(a[1], b[1], c[1]) - miny) * 0.5;
		return {
			origin: [minx + dx, miny + dy],
			radius: Math.sqrt(dx * dx + dy * dy),
		};
	}
	const origin = [(D * E - B * F) / G, (A * F - C * E) / G];
	const dx = origin[0] - a[0];
	const dy = origin[1] - a[1];
	return {
		origin,
		radius: Math.sqrt(dx * dx + dy * dy),
	};
};

export { circumcircle, trilateration2, trilateration3 };

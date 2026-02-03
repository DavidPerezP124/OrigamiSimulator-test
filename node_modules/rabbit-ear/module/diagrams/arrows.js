/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { convexHull } from '../math/convexHull.js';
import { subtract2, magnitude2, dot2, resize2 } from '../math/vector.js';
import { perpendicularBalancedSegment } from './general.js';
import { boundingBox } from '../math/polygon.js';
import { clipLineConvexPolygon } from '../math/clip.js';

const arrowFromSegment = (points, options = {}) => {
	if (points === undefined) { return undefined; }
	const vector = subtract2(points[1], points[0]);
	const length = magnitude2(vector);
	const padding = options.padding ? options.padding : length * 0.05;
	const direction = dot2(vector, [1, 0]);
	const vmin = options && options.vmin ? options.vmin : length;
	return {
		segment: [points[0], points[1]],
		head: {
			width: vmin * 0.0666,
			height: vmin * 0.1,
		},
		bend: direction > 0 ? 0.3 : -0.3,
		padding,
	};
};
const arrowFromSegmentInPolygon = (polygon, segment, options = {}) => {
	const vmin = options.vmin
		? options.vmin
		: Math.min(...(boundingBox(polygon)?.span || [1, 1]).slice(0, 2));
	return arrowFromSegment(segment, { ...options, vmin });
};
const arrowFromLine = (polygon, line, options) => {
	const segment = clipLineConvexPolygon(polygon, line);
	return segment === undefined
		? undefined
		: arrowFromSegmentInPolygon(polygon, segment, options)
};
const foldLineArrow = ({ vertices_coords }, foldLine, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2)
		.map(v => vertices_coords2[v]);
	const segment = perpendicularBalancedSegment(hull, foldLine);
	if (segment === undefined) { return undefined; }
	return arrowFromSegmentInPolygon(hull, segment, options);
};

export { arrowFromLine, arrowFromSegment, arrowFromSegmentInPolygon, foldLineArrow };

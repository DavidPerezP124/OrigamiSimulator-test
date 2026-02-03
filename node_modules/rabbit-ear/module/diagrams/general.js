/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { includeR, includeS } from '../math/compare.js';
import { rotate90, distance2, scale2, normalize2, add2, flip2, midpoint2, dot2, cross2 } from '../math/vector.js';
import { clipLineConvexPolygon } from '../math/clip.js';
import { intersectLineLine } from '../math/intersect.js';

const getLineMidpointInPolygon = (polygon, line) => {
	const segment = clipLineConvexPolygon(polygon, line);
	return segment === undefined
		? undefined
		: midpoint2(segment[0], segment[1]);
};
const perpendicularBalancedSegment = (polygon, line, point) => {
	const origin = point === undefined
		? getLineMidpointInPolygon(polygon, line)
		: point;
	const vector = rotate90(line.vector);
	const clip = clipLineConvexPolygon(polygon, { vector, origin });
	if (!clip) {
		return undefined;
	}
	const shortest = clip
		.map(pt => distance2(origin, pt))
		.sort((a, b) => a - b)
		.shift();
	const scaled = scale2(normalize2(vector), shortest);
	return [
		add2(origin, flip2(scaled)),
		add2(origin, scaled),
	];
};
const betweenTwoSegments = (foldLine, lines, segments) => {
	const midpoints = segments.map(seg => midpoint2(seg[0], seg[1]));
	const origin = midpoint2(midpoints[0], midpoints[1]);
	const perpendicular = { vector: rotate90(foldLine.vector), origin };
	return lines.map(line => intersectLineLine(line, perpendicular).point);
};
const betweenTwoIntersectingSegments = (lines, intersect, foldLine, boundary) => {
	const paramVectors = lines.map(l => l.vector);
	const flippedVectors = paramVectors.map(flip2);
	const paramRays = paramVectors
		.concat(flippedVectors)
		.map(vector => ({ vector, origin: intersect }));
	const dots = paramRays.map(ray => dot2(ray.vector, foldLine.vector));
	const crosses = paramRays.map(ray => cross2(ray.vector, foldLine.vector));
	const a1 = paramRays
		.filter((ray, i) => dots[i] > 0 && crosses[i] > 0)
		.shift();
	const a2 = paramRays
		.filter((ray, i) => dots[i] > 0 && crosses[i] < 0)
		.shift();
	const b1 = paramRays
		.filter((ray, i) => dots[i] < 0 && crosses[i] > 0)
		.shift();
	const b2 = paramRays
		.filter((ray, i) => dots[i] < 0 && crosses[i] < 0)
		.shift();
	const rayClips = [a1, a2, b1, b2].map(ray => clipLineConvexPolygon(
		boundary,
		ray,
		includeS,
		includeR,
	));
	if (rayClips.includes(undefined)) { return; }
	const rayEndpoints = rayClips.map(clips => clips.shift());
	const rayLengths = rayEndpoints.map(pt => distance2(pt, intersect));
	const arrow1Start = (rayLengths[0] < rayLengths[1]
		? rayEndpoints[0]
		: rayEndpoints[1]);
	const arrow1End = (rayLengths[0] < rayLengths[1]
		? add2(a2.origin, scale2(normalize2(a2.vector), rayLengths[0]))
		: add2(a1.origin, scale2(normalize2(a1.vector), rayLengths[1])));
	const arrow2Start = (rayLengths[2] < rayLengths[3]
		? rayEndpoints[2]
		: rayEndpoints[3]);
	const arrow2End = (rayLengths[2] < rayLengths[3]
		? add2(b2.origin, scale2(normalize2(b2.vector), rayLengths[2]))
		: add2(b1.origin, scale2(normalize2(b1.vector), rayLengths[3])));
	return [
		[arrow1Start, arrow1End],
		[arrow2Start, arrow2End],
	];
};

export { betweenTwoIntersectingSegments, betweenTwoSegments, perpendicularBalancedSegment };

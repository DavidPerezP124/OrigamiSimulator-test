/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { includeS } from '../math/compare.js';
import { pointsToLine2 } from '../math/convert.js';
import { convexHull } from '../math/convexHull.js';
import { resize2 } from '../math/vector.js';
import { multiplyMatrix2Vector2, makeMatrix2Reflect } from '../math/matrix2.js';
import { intersectLineLine } from '../math/intersect.js';
import { clipLineConvexPolygon } from '../math/clip.js';
import { axiom1, axiom3, axiom4, axiom5, axiom6, axiom7 } from '../axioms/axioms.js';
import { perpendicularBalancedSegment, betweenTwoSegments, betweenTwoIntersectingSegments } from './general.js';
import { arrowFromSegmentInPolygon, foldLineArrow } from './arrows.js';

const diagramReflectPoint = ({ vector, origin }, point) => (
	multiplyMatrix2Vector2(makeMatrix2Reflect(vector, origin), point)
);
const axiom1Arrows = ({ vertices_coords }, point1, point2, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	return axiom1(point1, point2)
		.map(line => perpendicularBalancedSegment(hull, line))
		.map(segment => arrowFromSegmentInPolygon(hull, segment, options));
};
const axiom2Arrows = ({ vertices_coords }, point1, point2, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	return [arrowFromSegmentInPolygon(hull, [point1, point2], options)];
};
const axiom3Arrows = ({ vertices_coords }, line1, line2, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	const foldLines = axiom3(line1, line2);
	const segments = [line1, line2]
		.map(line => clipLineConvexPolygon(hull, line))
		.filter(a => a !== undefined);
	if (segments.length !== 2) {
		return foldLines
			.map(foldLine => foldLineArrow({ vertices_coords }, foldLine, options));
	}
	const [lineA, lineB] = segments.map(([a, b]) => pointsToLine2(a, b));
	const intersect = intersectLineLine(lineA, lineB, includeS, includeS).point;
	const result = !intersect
		? [betweenTwoSegments(
			foldLines.filter(a => a !== undefined).shift(),
			[line1, line2],
			segments,
		)]
		: foldLines.map(foldLine => betweenTwoIntersectingSegments(
			[line1, line2],
			intersect,
			foldLine,
			hull,
		));
	return result.map(seg => arrowFromSegmentInPolygon(hull, seg, options));
};
const axiom4Arrows = ({ vertices_coords }, line, point, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	const foldLine = axiom4(line, point).shift();
	const origin = intersectLineLine(foldLine, line).point;
	const segment = perpendicularBalancedSegment(hull, foldLine, origin);
	return [arrowFromSegmentInPolygon(hull, segment, options)];
};
const axiom5Arrows = ({ vertices_coords }, line, point1, point2, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	return axiom5(line, point1, point2)
		.map(foldLine => [point2, diagramReflectPoint(foldLine, point2)])
		.map(segment => arrowFromSegmentInPolygon(hull, segment, options));
};
const axiom6Arrows = ({ vertices_coords }, line1, line2, point1, point2, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	return axiom6(line1, line2, point1, point2)
		.flatMap(foldLine => [point1, point2]
			.map(point => [point, diagramReflectPoint(foldLine, point)]))
		.map(segment => arrowFromSegmentInPolygon(hull, segment, options));
};
const axiom7Arrows = ({ vertices_coords }, line1, line2, point, options) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const hull = convexHull(vertices_coords2).map(v => vertices_coords2[v]);
	return axiom7(line1, line2, point)
		.flatMap(foldLine => [
			[point, diagramReflectPoint(foldLine, point)],
			perpendicularBalancedSegment(
				hull,
				foldLine,
				intersectLineLine(foldLine, line2).point,
			),
		])
		.filter(a => a !== undefined)
		.map(segment => arrowFromSegmentInPolygon(hull, segment, options));
};

export { axiom1Arrows, axiom2Arrows, axiom3Arrows, axiom4Arrows, axiom5Arrows, axiom6Arrows, axiom7Arrows, diagramReflectPoint };

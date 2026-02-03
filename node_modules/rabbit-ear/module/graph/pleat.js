/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { includeS, includeL } from '../math/compare.js';
import { pleat as pleat$1 } from '../math/line.js';
import { intersectLineLine } from '../math/intersect.js';
import { add2, scale2 } from '../math/vector.js';
import { edgesToLines2, edgeToLine2 } from './edges/lines.js';

const pleat = (
	{ vertices_coords, edges_vertices },
	lineA,
	lineB,
	count,
	epsilon = EPSILON,
) => {
	const edges_lines = edgesToLines2({ vertices_coords, edges_vertices });
	return pleat$1(lineA, lineB, count, epsilon)
		.map(lines => lines.map(line => {
			const dots = edges_lines
				.map(edgeLine => intersectLineLine(
					line,
					edgeLine,
					includeL,
					includeS,
					epsilon,
				).a)
				.filter(a => a !== undefined);
			if (dots.length < 2) { return undefined; }
			const min = Math.min(...dots);
			const max = Math.max(...dots);
			const segment = Math.abs(max - min) < epsilon
				? undefined
				: [
					add2(line.origin, scale2(line.vector, min)),
					add2(line.origin, scale2(line.vector, max)),
				];
			return segment;
		}).filter(a => a !== undefined));
};
const pleatEdges = (
	{ vertices_coords, edges_vertices },
	edgeA,
	edgeB,
	count,
	epsilon = EPSILON,
) => {
	const lineA = edgeToLine2({ vertices_coords, edges_vertices }, edgeA);
	const lineB = edgeToLine2({ vertices_coords, edges_vertices }, edgeB);
	return pleat({ vertices_coords, edges_vertices }, lineA, lineB, count, epsilon);
};

export { pleat, pleatEdges };

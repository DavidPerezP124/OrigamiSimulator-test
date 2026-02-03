/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { includeS } from '../math/compare.js';
import { magSquared2, dot2, subtract2, add2, scale2, resize2 } from '../math/vector.js';
import { intersectLineLine } from '../math/intersect.js';
import { epsilonUniqueSortedNumbers, setDifferenceSortedEpsilonNumbers } from '../general/array.js';
import { sweepValues } from './sweep.js';
import { invertFlatToArrayMap, invertFlatMap } from './maps.js';
import { remove } from './remove.js';
import { removeIsolatedVertices, edgeIsolatedVertices } from './vertices/isolated.js';
import { isVertexCollinear } from './vertices/collinear.js';
import { removeDuplicateVertices } from './vertices/duplicate.js';
import { getEdgesLine } from './edges/lines.js';
import { duplicateEdges, removeDuplicateEdges } from './edges/duplicate.js';
import { removeCircularEdges, circularEdges } from './edges/circular.js';
import { makeVerticesEdgesUnsorted } from './make/verticesEdges.js';

const getLinesIntersections = (lines, epsilon = EPSILON) => {
	const lines2D = lines.map(({ vector, origin }) => ({
		vector: resize2(vector),
		origin: resize2(origin),
	}));
	const linesIntersect = lines2D.map(() => []);
	for (let i = 0; i < lines2D.length - 1; i += 1) {
		for (let j = i + 1; j < lines2D.length; j += 1) {
			const { a, b, point } = intersectLineLine(
				lines2D[i],
				lines2D[j],
				includeS,
				includeS,
				epsilon,
			);
			if (point === undefined) { continue; }
			linesIntersect[i].push(a);
			linesIntersect[j].push(b);
		}
	}
	return linesIntersect;
};
const removeCollinearVertex = ({ edges_vertices, vertices_edges }, vertex) => {
	const edges = vertices_edges[vertex].sort((a, b) => a - b);
	const otherVertices = edges
		.flatMap(e => edges_vertices[e])
		.filter(v => v !== vertex);
	const newEdgeVertices = [otherVertices[0], otherVertices[1]];
	edges_vertices[edges[0]] = newEdgeVertices;
	edges_vertices[edges[1]] = undefined;
	newEdgeVertices.forEach(v => {
		const oldEdgeIndex = vertices_edges[v].indexOf(edges[1]);
		if (oldEdgeIndex === -1) { return; }
		vertices_edges[v][oldEdgeIndex] = edges[0];
	});
	return edges[1];
};
const planarize = ({
	vertices_coords,
	edges_vertices,
	edges_assignment,
	edges_foldAngle,
}, epsilon = EPSILON) => {
	const {
		lines,
		edges_line,
	} = getEdgesLine({ vertices_coords, edges_vertices }, epsilon);
	const linesSquareLength = lines.map(({ vector }) => magSquared2(vector));
	const lines_edges = invertFlatToArrayMap(edges_line);
	const edges_scalars = edges_vertices
		.map((verts, e) => verts
			.map(v => vertices_coords[v])
			.map(point => dot2(
				subtract2(point, lines[edges_line[e]].origin),
				lines[edges_line[e]].vector,
			)));
	const lines_flatEdgeScalars = lines_edges
		.map(edges => edges.flatMap(edge => edges_scalars[edge]))
		.map(numbers => epsilonUniqueSortedNumbers(numbers, epsilon));
	const lines_intersections = getLinesIntersections(lines, epsilon)
		.map(numbers => epsilonUniqueSortedNumbers(numbers, epsilon))
		.map((numbers, i) => numbers.map(n => n * linesSquareLength[i]))
		.map((sects, i) => (
			setDifferenceSortedEpsilonNumbers(sects, lines_flatEdgeScalars[i], epsilon)
		));
	const sweepScalars = lines_edges
		.map(edges => edges.flatMap(edge => edges_scalars[edge]));
	const sweepEdgesVertices = lines_edges
		.map(edges => invertFlatMap(edges)
			.map(e => [e * 2, e * 2 + 1]));
	const lineSweeps = lines_edges.map((_, i) => sweepValues(
		{ edges_vertices: sweepEdgesVertices[i] },
		sweepScalars[i],
		epsilon,
	));
	const lineSweeps_vertices = lineSweeps.map(sweep => sweep.map(el => el.t));
	const lineSweeps_edges = lineSweeps.map(sweep => {
		const current = {};
		const edges = sweep.map(el => {
			el.start.forEach(n => { current[n] = true; });
			el.end.forEach(n => { delete current[n]; });
			return Object.keys(current).map(n => parseInt(n, 10));
		});
		edges.pop();
		return edges;
	});
	lines_intersections.forEach((points, i) => {
		const vertices = lineSweeps_vertices[i];
		const edges = lineSweeps_edges[i];
		let pi = 0;
		let vi = 0;
		while (pi < points.length && vi < vertices.length - 1) {
			if (points[pi] <= vertices[vi]) { throw new Error("bad algorithm"); }
			if (points[pi] > vertices[vi + 1]) { vi += 1; continue; }
			vertices.splice(vi + 1, 0, points[pi]);
			edges.splice(vi + 1, 0, edges[vi]);
			pi += 1;
		}
	});
	const new_vertices_coords = lineSweeps_vertices
		.flatMap((scalars, i) => scalars
			.map(s => s / linesSquareLength[i])
			.map(s => add2(lines[i].origin, scale2(lines[i].vector, s))));
	let e = 0;
	const new_edges_vertices = lineSweeps_edges
		.map(edges => {
			const vertices = edges.map(() => [e, ++e]);
			e += 1;
			return vertices;
		})
		.flatMap((edges, i) => edges
			.filter((_, j) => lineSweeps_edges[i][j].length))
		.map(resize2);
	const result = {
		vertices_coords: new_vertices_coords,
		edges_vertices: new_edges_vertices,
	};
	if (edges_assignment || edges_foldAngle) {
		const edges_prevEdge = lineSweeps_edges
			.flatMap(edges => edges.filter(arr => arr.length));
		if (edges_assignment) {
			result.edges_assignment = edges_prevEdge
				.map(prev => edges_assignment[prev[0]]);
		}
		if (edges_foldAngle) {
			result.edges_foldAngle = edges_prevEdge
				.map(prev => edges_foldAngle[prev[0]]);
		}
	}
	removeIsolatedVertices(result, edgeIsolatedVertices(result));
	removeDuplicateVertices(result, epsilon);
	removeCircularEdges(result);
	result.vertices_edges = makeVerticesEdgesUnsorted(result);
	const collinearVertices = result.vertices_edges
		.map((edges, i) => (edges.length === 2 ? i : undefined))
		.filter(a => a !== undefined)
		.filter(v => isVertexCollinear(result, v, epsilon))
		.reverse();
	const edgesToRemove = collinearVertices
		.map(v => removeCollinearVertex(result, v));
	remove(result, "edges", edgesToRemove);
	remove(result, "vertices", collinearVertices);
	const dupEdges = duplicateEdges(result);
	if (dupEdges.length) {
		removeDuplicateEdges(result, dupEdges);
	}
	if (circularEdges(result).length) {
		console.error("planarize: found circular edges");
	}
	delete result.vertices_edges;
	return result;
};

export { planarize };

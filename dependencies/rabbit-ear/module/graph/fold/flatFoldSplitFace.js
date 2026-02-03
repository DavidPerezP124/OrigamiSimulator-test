/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../../environment/messages.js';
import { EPSILON } from '../../math/constant.js';
import { excludeS, includeL } from '../../math/compare.js';
import { overlapLinePoint } from '../../math/overlap.js';
import { intersectLineLine } from '../../math/intersect.js';
import { resize2, subtract2, distance, subtract } from '../../math/vector.js';
import { sortVerticesCounterClockwise } from '../vertices/sort.js';
import { makeVerticesToEdge } from '../make/lookup.js';
import { mergeNextmaps, invertFlatMap, mergeBackmaps } from '../maps.js';
import { splitEdge } from '../split/splitEdge.js';
import { remove } from '../remove.js';

const intersectConvexFaceLine = ({
	vertices_coords, edges_vertices, faces_vertices, faces_edges,
}, face, { vector, origin }, epsilon = EPSILON) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const face_vertices_indices = faces_vertices[face]
		.map(v => vertices_coords2[v])
		.map(coord => overlapLinePoint({ vector, origin }, coord, () => true, epsilon))
		.map((overlap, i) => (overlap ? i : undefined))
		.filter(i => i !== undefined);
	const vertices = face_vertices_indices.map(i => faces_vertices[face][i]);
	const vertices_are_neighbors = face_vertices_indices
		.concat(face_vertices_indices.map(i => i + faces_vertices[face].length))
		.map((n, i, arr) => arr[i + 1] - n === 1)
		.reduce((a, b) => a || b, false);
	if (vertices_are_neighbors) { return undefined; }
	if (vertices.length > 1) { return { vertices, edges: [] }; }
	const edges = faces_edges[face]
		.map(edge => edges_vertices[edge]
			.map(v => vertices_coords2[v]))
		.map(seg => intersectLineLine(
			{ vector, origin },
			{ vector: subtract2(seg[1], seg[0]), origin: seg[0] },
			includeL,
			excludeS,
			epsilon,
		).point).map((coords, face_edge_index) => ({
			coords,
			edge: faces_edges[face][face_edge_index],
		}))
		.filter(el => el.coords !== undefined)
		.filter(el => !(vertices
			.map(v => edges_vertices[el.edge].includes(v))
			.reduce((a, b) => a || b, false)));
	return (edges.length + vertices.length === 2
		? { vertices, edges }
		: undefined);
};
const splitCircularArray = (array, indices) => {
	indices.sort((a, b) => a - b);
	return [
		array.slice(indices[1]).concat(array.slice(0, indices[0] + 1)),
		array.slice(indices[0], indices[1] + 1),
	];
};
const make_faces = ({
	edges_vertices, faces_vertices, faces_edges,
}, face, vertices) => {
	const indices = vertices.map(el => faces_vertices[face].indexOf(el));
	const faces = splitCircularArray(faces_vertices[face], indices)
		.map(fv => ({ faces_vertices: fv, faces_edges: [] }));
	if (faces_edges) {
		const vertices_to_edge = makeVerticesToEdge({ edges_vertices });
		faces
			.map(this_face => this_face.faces_vertices
				.map((fv, i, arr) => `${fv} ${arr[(i + 1) % arr.length]}`)
				.map(key => vertices_to_edge[key]))
			.forEach((face_edges, i) => { faces[i].faces_edges = face_edges; });
	}
	return faces;
};
const build_faces = (graph, face, vertices) => {
	const faces = [0, 1].map(i => graph.faces_vertices.length + i);
	make_faces(graph, face, vertices)
		.forEach((newface, i) => Object.keys(newface)
			.forEach((key) => { graph[key][faces[i]] = newface[key]; }));
	return faces;
};
const make_edge = ({ vertices_coords }, vertices, face) => {
	const new_edge_coords = vertices
		.slice()
		.map(v => vertices_coords[v])
		.reverse();
	return {
		edges_vertices: [...vertices],
		edges_foldAngle: 0,
		edges_assignment: "U",
		edges_length: distance(new_edge_coords[0], new_edge_coords[1]),
		edges_vector: subtract(new_edge_coords[0], new_edge_coords[1]),
		edges_faces: [face, face],
	};
};
const rebuild_edge = (graph, face, vertices) => {
	const edge = graph.edges_vertices.length;
	const new_edge = make_edge(graph, vertices, face);
	Object.keys(new_edge)
		.filter(key => graph[key] !== undefined)
		.forEach((key) => { graph[key][edge] = new_edge[key]; });
	return edge;
};
const split_at_intersections = (graph, { vertices, edges }) => {
	let map;
	const split_results = edges.map((el) => {
		const res = splitEdge(graph, map ? map[el.edge] : el.edge, el.coords);
		map = map ? mergeNextmaps(map, res.edges.map) : res.edges.map;
		return res;
	});
	vertices.push(...split_results.map(res => res.vertex));
	let bkmap;
	split_results.forEach(res => {
		res.edges.remove = bkmap ? bkmap[res.edges.remove] : res.edges.remove;
		const inverted = invertFlatMap(res.edges.map);
		bkmap = bkmap ? mergeBackmaps(bkmap, inverted) : inverted;
	});
	return {
		vertices,
		edges: {
			map,
			remove: split_results.map(res => res.edges.remove),
		},
	};
};
const update_vertices_vertices = ({
	vertices_coords, vertices_vertices, edges_vertices,
}, edge) => {
	const v0 = edges_vertices[edge][0];
	const v1 = edges_vertices[edge][1];
	vertices_vertices[v0] = sortVerticesCounterClockwise(
		{ vertices_coords },
		vertices_vertices[v0].concat(v1),
		v0,
	);
	vertices_vertices[v1] = sortVerticesCounterClockwise(
		{ vertices_coords },
		vertices_vertices[v1].concat(v0),
		v1,
	);
};
const update_vertices_edges = ({
	edges_vertices, vertices_edges, vertices_vertices,
}, edge) => {
	if (!vertices_edges || !vertices_vertices) { return; }
	const vertices = edges_vertices[edge];
	vertices
		.map(v => vertices_vertices[v])
		.map((vert_vert, i) => vert_vert
			.indexOf(vertices[(i + 1) % vertices.length]))
		.forEach((radial_index, i) => vertices_edges[vertices[i]]
			.splice(radial_index, 0, edge));
};
const update_vertices_faces = (graph, old_face, new_faces) => {
	const vertices_replacement_faces = {};
	new_faces
		.forEach(f => graph.faces_vertices[f]
			.forEach(v => {
				if (!vertices_replacement_faces[v]) {
					vertices_replacement_faces[v] = [];
				}
				vertices_replacement_faces[v].push(f);
			}));
	graph.faces_vertices[old_face].forEach(v => {
		const index = graph.vertices_faces[v].indexOf(old_face);
		const replacements = vertices_replacement_faces[v];
		if (index === -1 || !replacements) {
			throw new Error(Messages.convexFace);
		}
		graph.vertices_faces[v].splice(index, 1, ...replacements);
	});
};
const update_edges_faces = (graph, old_face, new_edge, new_faces) => {
	const edges_replacement_faces = {};
	new_faces
		.forEach(f => graph.faces_edges[f]
			.forEach(e => {
				if (!edges_replacement_faces[e]) { edges_replacement_faces[e] = []; }
				edges_replacement_faces[e].push(f);
			}));
	const edges = [...graph.faces_edges[old_face], new_edge];
	edges.forEach(e => {
		const replacements = edges_replacement_faces[e];
		const indices = [];
		for (let i = 0; i < graph.edges_faces[e].length; i += 1) {
			if (graph.edges_faces[e][i] === old_face) { indices.push(i); }
		}
		if (indices.length === 0 || !replacements) {
			throw new Error(Messages.convexFace);
		}
		indices.reverse().forEach(index => graph.edges_faces[e].splice(index, 1));
		const index = indices[indices.length - 1];
		graph.edges_faces[e].splice(index, 0, ...replacements);
	});
};
const update_faces_faces = ({ faces_vertices, faces_faces }, old_face, new_faces) => {
	const incident_faces = faces_faces[old_face];
	const new_faces_vertices = new_faces.map(f => faces_vertices[f]);
	const incident_face_face = incident_faces.map(f => {
		if (f === undefined || f === null) { return undefined; }
		const incident_face_vertices = faces_vertices[f];
		const score = [0, 0];
		for (let n = 0; n < new_faces_vertices.length; n += 1) {
			let count = 0;
			for (let j = 0; j < incident_face_vertices.length; j += 1) {
				if (new_faces_vertices[n].indexOf(incident_face_vertices[j]) !== -1) {
					count += 1;
				}
			}
			score[n] = count;
		}
		if (score[0] >= 2) { return new_faces[0]; }
		if (score[1] >= 2) { return new_faces[1]; }
		return undefined;
	});
	new_faces.forEach((f, i, arr) => {
		faces_faces[f] = [arr[(i + 1) % new_faces.length]];
	});
	incident_faces.forEach((f, i) => {
		if (f === undefined || f === null) { return; }
		for (let j = 0; j < faces_faces[f].length; j += 1) {
			if (faces_faces[f][j] === old_face) {
				faces_faces[f][j] = incident_face_face[i];
				faces_faces[incident_face_face[i]].push(f);
			}
		}
	});
};
const splitFaceWithLine = (graph, face, line, epsilon) => {
	const intersect = intersectConvexFaceLine(graph, face, line, epsilon);
	if (intersect === undefined) { return undefined; }
	const result = split_at_intersections(graph, intersect);
	result.edges.new = rebuild_edge(graph, face, result.vertices);
	update_vertices_vertices(graph, result.edges.new);
	update_vertices_edges(graph, result.edges.new);
	const faces = build_faces(graph, face, result.vertices);
	update_vertices_faces(graph, face, faces);
	update_edges_faces(graph, face, result.edges.new, faces);
	update_faces_faces(graph, face, faces);
	const faces_map = remove(graph, "faces", [face]);
	faces.forEach((_, i) => { faces[i] = faces_map[faces[i]]; });
	faces_map.splice(-2);
	const facesMap = faces_map.slice();
	facesMap[face] = faces;
	result.faces = {
		map: facesMap,
		new: faces,
		remove: face,
	};
	return result;
};

export { splitFaceWithLine };

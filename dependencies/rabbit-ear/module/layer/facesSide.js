/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { cross2, subtract2, resize3 } from '../math/vector.js';
import { multiplyMatrix4Vector3, multiplyMatrix4Line3 } from '../math/matrix4.js';
import { pointsToLine } from '../math/convert.js';
import { edgeToLine2 } from '../graph/edges/lines.js';
import { makeFacesCenter2DQuick, makeFacesCenter3DQuick } from '../graph/make/faces.js';
import { uniqueElements } from '../general/array.js';
import { invertFlatToArrayMap } from '../graph/maps.js';

const makeEdgesFacesSide = ({
	vertices_coords, edges_vertices, edges_faces, faces_center,
}) => {
	const edgesLine = edges_vertices
		.map(verts => verts.map(v => vertices_coords[v]))
		.map(([a, b]) => pointsToLine(a, b));
	return edges_faces
		.map((faces, i) => faces
			.map(face => cross2(
				subtract2(faces_center[face], edgesLine[i].origin),
				edgesLine[i].vector,
			))
			.map(cross => Math.sign(cross)));
};
const makeEdgePairsFacesSide = (
	{ vertices_coords, edges_vertices, edges_faces, faces_center },
	edgePairs,
) => {
	const edgePairsLine = edgePairs
		.map(([edge]) => edgeToLine2({ vertices_coords, edges_vertices }, edge));
	return edgePairs
		.map(pair => pair.map(edge => edges_faces[edge]))
		.map((faces, i) => faces
			.map(face_pair => face_pair
				.map(face => faces_center[face])
				.map(center => cross2(
					subtract2(center, edgePairsLine[i].origin),
					edgePairsLine[i].vector,
				))
				.map(Math.sign)))
		.map(arr => [[arr[0][0], arr[0][1]], [arr[1][0], arr[1][1]]]);
};
const makeEdgesFacesSide2D = (
	{ vertices_coords, edges_faces, faces_vertices, faces_center },
	{ lines, edges_line },
) => {
	if (!faces_center) {
		faces_center = makeFacesCenter2DQuick({ vertices_coords, faces_vertices });
	}
	return edges_faces
		.map((faces, e) => faces
			.map(face => {
				const { vector, origin } = lines[edges_line[e]];
				return cross2(subtract2(faces_center[face], origin), vector);
			})
			.map(Math.sign));
};
const makeEdgesFacesSide3D = (
	{ vertices_coords, edges_faces, faces_vertices, faces_center },
	{ lines, edges_line, planes_transform, faces_plane },
) => {
	if (!faces_center) {
		faces_center = makeFacesCenter3DQuick({ vertices_coords, faces_vertices })
			.map((center, f) => multiplyMatrix4Vector3(
				planes_transform[faces_plane[f]],
				center,
			));
	}
	const lines_planes = invertFlatToArrayMap(edges_line)
		.map(edges => edges.flatMap(e => edges_faces[e].map(f => faces_plane[f])))
		.map(planes => uniqueElements(planes));
	const lines3D = lines.map(({ vector, origin }) => ({
		vector: resize3(vector),
		origin: resize3(origin),
	}));
	const lines2DInPlane = lines.map(() => []);
	lines_planes.forEach((planes, l) => planes.forEach(p => {
		const { vector, origin } = lines3D[l];
		lines2DInPlane[l][p] = multiplyMatrix4Line3(planes_transform[p], vector, origin);
	}));
	return edges_faces
		.map((faces, e) => faces
			.map(face => {
				const { vector, origin } = lines2DInPlane[edges_line[e]][faces_plane[face]];
				return cross2(subtract2(faces_center[face], origin), vector);
			})
			.map(Math.sign));
};

export { makeEdgePairsFacesSide, makeEdgesFacesSide, makeEdgesFacesSide2D, makeEdgesFacesSide3D };

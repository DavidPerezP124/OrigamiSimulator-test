/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { parallelNormalized, dot3, resize3, scale3, dot, flip3, resize2 } from '../../math/vector.js';
import { makePolygonNonCollinear3 } from '../../math/polygon.js';
import { multiplyMatrix4Vector3 } from '../../math/matrix4.js';
import { matrix4FromQuaternion, quaternionFromTwoVectors } from '../../math/quaternion.js';
import { overlapConvexPolygons } from '../../math/overlap.js';
import { clusterScalars } from '../../general/cluster.js';
import { connectedComponents } from '../connectedComponents.js';
import { invertFlatToArrayMap, invertArrayToFlatMap } from '../maps.js';
import { makeFacesFaces } from '../make/facesFaces.js';
import { makeFacesNormal } from '../normals.js';
import { selfRelationalArraySubset } from '../subgraph.js';

const getFacesPlane = (
	{ vertices_coords, faces_vertices },
	epsilon = EPSILON,
) => {
	const faces_normal = makeFacesNormal({ vertices_coords, faces_vertices });
	const facesNormalMatch = faces_vertices.map(() => []);
	for (let a = 0; a < faces_vertices.length - 1; a += 1) {
		for (let b = a + 1; b < faces_vertices.length; b += 1) {
			if (parallelNormalized(faces_normal[a], faces_normal[b], epsilon)) {
				facesNormalMatch[a].push(b);
				facesNormalMatch[b].push(a);
			}
		}
	}
	const facesNormalMatchCluster = connectedComponents(facesNormalMatch);
	const normalClustersFaces = invertFlatToArrayMap(facesNormalMatchCluster);
	const normalClustersNormal = normalClustersFaces
		.map(faces => faces_normal[faces[0]]);
	const faces_winding = [];
	normalClustersFaces.forEach((faces, i) => faces.forEach(f => {
		faces_winding[f] = dot3(faces_normal[f], normalClustersNormal[i]) > 0;
	}));
	const facesOneVertex = faces_vertices
		.map(fv => vertices_coords[fv[0]])
		.map(resize3);
	const normalClustersFacesDot = normalClustersFaces
		.map((faces, i) => faces
			.map(f => dot3(normalClustersNormal[i], facesOneVertex[f])));
	const clustersClusters = normalClustersFacesDot
		.map((dots, i) => clusterScalars(dots)
			.map(cluster => cluster.map(index => normalClustersFaces[i][index])));
	const planes_faces = clustersClusters.flat();
	const planes_normal = clustersClusters
		.flatMap((cluster, i) => cluster
			.map(() => normalClustersNormal[i]))
		.map(resize3);
	const planes_origin = planes_faces
		.map(faces => faces[0])
		.map(face => facesOneVertex[face])
		.map((point, i) => dot3(planes_normal[i], point))
		.map((mag, i) => scale3(planes_normal[i], mag));
	const planes = planes_faces.map((_, i) => ({
		normal: planes_normal[i],
		origin: planes_origin[i],
	}));
	const faces_plane = invertArrayToFlatMap(planes_faces);
	const targetVector = [0, 0, 1];
	const planes_transform = planes
		.map(({ normal }) => (Math.abs(dot(normal, targetVector) + 1) < epsilon
			? [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]
			: matrix4FromQuaternion(quaternionFromTwoVectors(normal, targetVector))));
	planes.forEach(({ origin }, p) => {
		const translation = multiplyMatrix4Vector3(planes_transform[p], flip3(origin));
		planes_transform[p][12] = translation[0];
		planes_transform[p][13] = translation[1];
		planes_transform[p][14] = translation[2];
	});
	return {
		planes,
		planes_faces,
		planes_transform,
		faces_plane,
		faces_winding,
	};
};
const getCoplanarAdjacentOverlappingFaces = (
	{ vertices_coords, faces_vertices, faces_faces },
	epsilon = EPSILON,
) => {
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	const {
		planes,
		planes_faces,
		planes_transform,
		faces_plane,
		faces_winding,
	} = getFacesPlane(
		{ vertices_coords, faces_vertices },
		epsilon,
	);
	const vertices_coords3D = vertices_coords.map(resize3);
	const faces_polygon = faces_vertices
		.map((verts, f) => (faces_winding[f] ? verts : verts.slice().reverse()))
		.map(verts => verts.map(v => vertices_coords3D[v]))
		.map(polygon => makePolygonNonCollinear3(polygon, epsilon))
		.map((polygon, f) => polygon
			.map(point => multiplyMatrix4Vector3(planes_transform[faces_plane[f]], point))
			.map(resize2));
	const planes_facesFaces = planes_faces
		.map(faces => selfRelationalArraySubset(faces_faces, faces));
	const planes_faces_connectedGroup = planes_facesFaces.map(connectedComponents);
	const planes_connectedGroups_faces = planes_faces_connectedGroup
		.map(faces => invertFlatToArrayMap(faces));
	const planes_faces_possibleOverlapFaces = planes_faces_connectedGroup
		.map(faces_group => {
			const faces = faces_group.map((_, i) => i);
			return faces_group.map(groupIndex => faces
				.filter(face => faces_group[face] !== groupIndex));
		});
	const planes_overlappingGroups = planes_connectedGroups_faces
		.map(connectedGroups_faces => connectedGroups_faces
			.map(() => []));
	planes_faces_possibleOverlapFaces.forEach((faces_possibleOverlapFaces, p) => {
		const overlappingGroupsKeys = {};
		faces_possibleOverlapFaces
			.forEach((otherFaces, face) => otherFaces
				.forEach(otherFace => {
					const groups = [face, otherFace]
						.map(f => planes_faces_connectedGroup[p][f]);
					const groupsKey1 = groups.join(" ");
					if (overlappingGroupsKeys[groupsKey1]) { return; }
					const overlap = overlapConvexPolygons(
						faces_polygon[face],
						faces_polygon[otherFace],
						epsilon,
					);
					if (overlap) {
						const groupsKey2 = groups.reverse().join(" ");
						overlappingGroupsKeys[groupsKey1] = true;
						overlappingGroupsKeys[groupsKey2] = true;
						planes_overlappingGroups[p][groups[0]].push(groups[1]);
						planes_overlappingGroups[p][groups[1]].push(groups[0]);
					}
				}));
	});
	const planes_clusters_groupIndices = planes_overlappingGroups
		.map(set_set => invertFlatToArrayMap(connectedComponents(set_set)));
	const clusters_plane = planes_clusters_groupIndices
		.flatMap((arrays, i) => arrays.map(() => i));
	const planes_clusters = invertFlatToArrayMap(clusters_plane);
	const clusters_faces = planes_clusters_groupIndices
		.flatMap((clusters_groupIndices, p) => clusters_groupIndices
			.map(groupIndices => groupIndices
				.flatMap(g => planes_connectedGroups_faces[p][g])));
	const faces_cluster = invertArrayToFlatMap(clusters_faces);
	return {
		planes,
		planes_faces,
		planes_transform,
		planes_clusters,
		faces_winding,
		faces_plane,
		faces_cluster,
		clusters_plane,
		clusters_faces,
	};
};

export { getCoplanarAdjacentOverlappingFaces, getFacesPlane };

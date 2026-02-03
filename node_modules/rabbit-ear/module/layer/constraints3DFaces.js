/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { resize3, average2 } from '../math/vector.js';
import { multiplyMatrix4Vector3 } from '../math/matrix4.js';
import { mergeArraysWithHoles } from '../general/array.js';
import { makeFacesPolygon } from '../graph/make/faces.js';
import { connectedComponentsPairs } from '../graph/connectedComponents.js';
import { getCoplanarAdjacentOverlappingFaces } from '../graph/faces/planes.js';
import { subgraphWithFaces } from '../graph/subgraph.js';
import { getFacesFacesOverlap } from '../graph/overlap.js';

const constraints3DFaceClusters = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment, edges_foldAngle,
	faces_vertices, faces_edges, faces_faces,
}, epsilon = EPSILON) => {
	const {
		planes_transform,
		faces_winding,
		faces_plane,
		faces_cluster,
		clusters_plane,
		clusters_faces,
	} = getCoplanarAdjacentOverlappingFaces({
		vertices_coords, faces_vertices, faces_faces,
	}, epsilon);
	const clusters_transform = clusters_plane.map(p => planes_transform[p]);
	const clusters_graph = clusters_faces.map(faces => subgraphWithFaces({
		vertices_coords,
		edges_vertices,
		edges_faces,
		edges_assignment,
		edges_foldAngle,
		faces_vertices,
		faces_edges,
		faces_faces,
	}, faces));
	const vertices_coords3D = vertices_coords.map(resize3);
	clusters_graph.forEach(({ vertices_coords: coords }, c) => {
		clusters_graph[c].vertices_coords = coords
			.map((_, v) => multiplyMatrix4Vector3(
				clusters_transform[c],
				vertices_coords3D[v],
			))
			.map(([x, y]) => [x, y]);
	});
	const faces_polygon = mergeArraysWithHoles(...clusters_graph
		.map(copy => makeFacesPolygon(copy, epsilon)));
	const faces_center = faces_polygon.map(coords => average2(...coords));
	clusters_graph.forEach(({ faces_vertices: fv }, c) => {
		clusters_graph[c].faces_center = fv.map((_, f) => faces_center[f]);
	});
	faces_winding
		.map((upright, i) => (upright ? undefined : i))
		.filter(a => a !== undefined)
		.forEach(f => faces_polygon[f].reverse());
	const facesFacesOverlap = mergeArraysWithHoles(...clusters_graph
		.map(graph => getFacesFacesOverlap(graph, epsilon)));
	const facePairs = connectedComponentsPairs(facesFacesOverlap)
		.map(pair => pair.join(" "));
	return {
		planes_transform,
		faces_plane,
		faces_cluster,
		faces_winding,
		faces_polygon,
		faces_center,
		clusters_faces,
		clusters_graph,
		clusters_transform,
		facesFacesOverlap,
		facePairs,
	};
};

export { constraints3DFaceClusters };

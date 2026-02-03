/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeOrthographicMatrix4, makePerspectiveMatrix4, identity4x4, invertMatrix4 } from '../../math/matrix4.js';
import { resize, midpoint } from '../../math/vector.js';
import { boundingBox } from '../../graph/boundary.js';

const rebuildViewport = (gl, canvas) => {
	if (!gl) { return; }
	const devicePixelRatio = window.devicePixelRatio || 1;
	const size = [canvas.clientWidth, canvas.clientHeight]
		.map(n => n * devicePixelRatio);
	if (canvas.width !== size[0] || canvas.height !== size[1]) {
		canvas.width = size[0];
		canvas.height = size[1];
	}
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
};
const makeProjectionMatrix = ([width, height], perspective = "perspective", fov = 45) => {
	const Z_NEAR = 0.1;
	const Z_FAR = 20;
	const ORTHO_FAR = -100;
	const ORTHO_NEAR = 100;
	const vmin = Math.min(width, height);
	const padding = [
		((width - vmin) / vmin) / 2,
		((height - vmin) / vmin) / 2,
	];
	const side = padding.map(p => p + 0.5);
	return perspective === "orthographic"
		? makeOrthographicMatrix4(side[1], side[0], -side[1], -side[0], ORTHO_FAR, ORTHO_NEAR)
		: makePerspectiveMatrix4(fov * (Math.PI / 180), width / height, Z_NEAR, Z_FAR);
};
const makeModelMatrix = (graph) => {
	if (!graph) { return [...identity4x4]; }
	const bounds = boundingBox(graph);
	if (!bounds) { return [...identity4x4]; }
	const scale = Math.max(...bounds.span);
	if (scale === 0) { return [...identity4x4]; }
	const center = resize(3, midpoint(bounds.min, bounds.max));
	const scalePositionMatrix = [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, scale, 0, ...center, 1];
	return invertMatrix4(scalePositionMatrix) || [...identity4x4];
};

export { makeModelMatrix, makeProjectionMatrix, rebuildViewport };

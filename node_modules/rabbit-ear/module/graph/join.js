/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { count } from './count.js';
import { clone } from '../general/clone.js';
import { remapKey, invertFlatToArrayMap } from './maps.js';
import { getDimensionQuick, VEF, filterKeysWithPrefix } from '../fold/spec.js';

const join = (target, source) => {
	const sourceDimension = getDimensionQuick(source);
	const targetDimension = getDimensionQuick(target);
	const sourceKeyArrays = {};
	VEF.forEach(key => {
		const arrayName = filterKeysWithPrefix(source, key).shift();
		sourceKeyArrays[key] = (arrayName !== undefined ? source[arrayName] : []);
	});
	const keyCount = {};
	VEF.forEach(key => { keyCount[key] = count(target, key); });
	const indexMaps = { vertices: [], edges: [], faces: [] };
	VEF.forEach(key => sourceKeyArrays[key]
		.forEach((_, i) => { indexMaps[key][i] = keyCount[key]++; }));
	const sourceClone = clone(source);
	VEF.forEach(key => remapKey(sourceClone, key, indexMaps[key]));
	Object.keys(sourceClone)
		.filter(key => sourceClone[key].constructor === Array)
		.filter(key => !(key in target))
		.forEach(key => { target[key] = []; });
	Object.keys(sourceClone)
		.filter(key => sourceClone[key].constructor === Array)
		.forEach(key => sourceClone[key]
			.forEach((v, i) => { target[key][i] = v; }));
	const summary = {};
	const targetKeyArrays = {};
	VEF.forEach(key => {
		const arrayName = filterKeysWithPrefix(target, key).shift();
		targetKeyArrays[key] = (arrayName !== undefined ? target[arrayName] : []);
	});
	VEF.forEach(key => {
		const map = targetKeyArrays[key].map(() => 0);
		indexMaps[key].forEach(v => { map[v] = 1; });
		summary[key] = invertFlatToArrayMap(map);
	});
	const target2DVertices = sourceDimension !== targetDimension
		? (target.vertices_coords || [])
			.map((coords, i) => (coords.length === 2 ? i : undefined))
			.filter(a => a !== undefined)
		: [];
	target2DVertices.forEach(v => { target.vertices_coords[v][2] = 0; });
	return summary;
};

export { join };

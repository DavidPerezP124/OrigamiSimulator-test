/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { clone } from '../general/clone.js';
import { foldToSvg } from '../convert/foldToSvg.js';
import { foldToObj } from '../convert/foldToObj.js';
import { clean } from '../graph/clean.js';
import { planarize } from '../graph/planarize.js';
import { populate } from '../graph/populate.js';
import * as splitEdge from '../graph/split/splitEdge.js';
import * as transform from '../graph/transform.js';
import * as explode from '../graph/explode.js';
import * as nearest from '../graph/nearest.js';
import * as validate from '../graph/validate/validate.js';
import { invertAssignments, foldKeys } from '../fold/spec.js';
import { subgraph } from '../graph/subgraph.js';
import { boundary, boundaries, planarBoundary, planarBoundaries, boundingBox } from '../graph/boundary.js';
import { makeVerticesCoordsFoldedFromMatrix2, makeVerticesCoordsFolded, makeVerticesCoordsFlatFolded } from '../graph/vertices/folded.js';

const Graph = {};
Graph.prototype = Object.create(Object.prototype);
Graph.prototype.constructor = Graph;
Object.entries({
	clean,
	populate,
	subgraph,
	boundary,
	boundaries,
	planarBoundary,
	planarBoundaries,
	boundingBox,
	invertAssignments,
	svg: foldToSvg,
	obj: foldToObj,
	...splitEdge,
	...explode,
	...nearest,
	...transform,
	...validate,
}).forEach(([key, value]) => {
	Graph.prototype[key] = function () {
		return value.apply(null, [this, ...arguments]);
	};
});
Graph.prototype.clone = function () {
	return Object.assign(Object.create(Object.getPrototypeOf(this)), clone(this));
};
Graph.prototype.planarize = function () {
	const result = planarize(this);
	this.clear();
	Object.assign(this, result);
	return this;
};
Graph.prototype.clear = function () {
	foldKeys.graph.forEach(key => delete this[key]);
	foldKeys.orders.forEach(key => delete this[key]);
	delete this.file_frames;
	return this;
};
Graph.prototype.folded = function () {
	const vertices_coords = this.faces_matrix2
		? makeVerticesCoordsFoldedFromMatrix2(this, this.faces_matrix2)
		: makeVerticesCoordsFolded(this, ...arguments);
	Object.assign(this, {
		vertices_coords,
		frame_classes: ["foldedForm"],
	});
	return this;
};
Graph.prototype.flatFolded = function () {
	const vertices_coords = this.faces_matrix2
		? makeVerticesCoordsFoldedFromMatrix2(this, this.faces_matrix2)
		: makeVerticesCoordsFlatFolded(this, ...arguments);
	Object.assign(this, {
		vertices_coords,
		frame_classes: ["foldedForm"],
	});
	return this;
};
const graphPrototype = Graph.prototype;

export { graphPrototype as default };

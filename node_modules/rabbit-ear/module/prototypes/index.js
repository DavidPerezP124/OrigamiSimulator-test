/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { file_spec, file_creator } from '../fold/rabbitear.js';
import * as bases from '../fold/bases.js';
import * as primitives from '../fold/primitives.js';
import { populate } from '../graph/populate.js';
import graphPrototype from './graph.js';

const makeGraphInstance = (...args) => Object
	.assign(Object.create(graphPrototype), {
		...args.reduce((a, b) => ({ ...a, ...b }), ({})),
		file_spec,
		file_creator,
	});
const Graph = function () {
	return populate(makeGraphInstance(...arguments));
};
Graph.prototype = graphPrototype;
Graph.prototype.constructor = Graph;
Object.keys(primitives).forEach(baseName => {
	Graph[baseName] = (...args) => makeGraphInstance(primitives[baseName](...args));
});
Object.keys(bases).forEach(baseName => {
	Graph[baseName] = (...args) => makeGraphInstance(bases[baseName](...args));
});
const graphConstructor = Graph;

export { graphConstructor };

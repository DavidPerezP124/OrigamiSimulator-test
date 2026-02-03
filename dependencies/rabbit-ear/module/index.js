/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { setWindow } from './environment/window.js';
import axiom from './axioms/index.js';
import convert from './convert/index.js';
import general from './general/index.js';
import graphExport from './graph/index.js';
import math from './math/index.js';
import singleVertex from './singleVertex/index.js';
import SVG from './svg/index.js';
import webgl from './webgl/index.js';
import layerExport from './layer/index.js';
import diagram from './diagrams/index.js';
import lib from './svg/environment/lib.js';
import * as types from './types.js';

const ear = {
	axiom,
	convert,
	diagram,
	general,
	graph: graphExport,
	layer: layerExport,
	math,
	singleVertex,
	svg: SVG,
	webgl,
	...types,
};
lib.ear = ear;
const earExport = ear;
Object.defineProperty(earExport, "window", {
	enumerable: false,
	set: value => { SVG.window = setWindow(value); },
});

export { ear as default };

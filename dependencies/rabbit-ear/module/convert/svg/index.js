/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as color from './color.js';
import * as drawBoundaries from './drawBoundaries.js';
import * as drawVertices from './drawVertices.js';
import * as drawEdges from './drawEdges.js';
import * as drawFaces from './drawFaces.js';
import * as parse from './parse.js';
import * as stylesheet from './stylesheet.js';

const svg = {
	...color,
	...drawBoundaries,
	...drawVertices,
	...drawEdges,
	...drawFaces,
	...parse,
	...stylesheet,
};

export { svg as default };

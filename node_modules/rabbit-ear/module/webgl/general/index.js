/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as colors from './colors.js';
import * as model from './model.js';
import * as view from './view.js';
import * as webgl from './webgl.js';

const general = {
	...colors,
	...model,
	...view,
	...webgl,
};

export { general as default };

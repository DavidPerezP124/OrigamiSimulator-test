/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as arrays from './arrays.js';
import * as data from './data.js';
import * as models from './models.js';
import * as shaders from './shaders.js';
import * as uniforms from './uniforms.js';

const foldedForm = {
	...arrays,
	...data,
	...models,
	...shaders,
	...uniforms,
};

export { foldedForm as default };

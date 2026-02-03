/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as degree4 from './degree4.js';
import * as flatFoldable from './flatFoldable.js';
import * as foldable from './foldable.js';
import * as kawasaki from './kawasaki.js';
import * as maekawa from './maekawa.js';

const singleVertex = {
	...degree4,
	...flatFoldable,
	...foldable,
	...kawasaki,
	...maekawa,
};

export { singleVertex as default };

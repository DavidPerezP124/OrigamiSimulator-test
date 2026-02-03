/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as array from './array.js';
import * as cluster from './cluster.js';
import * as number from './number.js';
import * as sort from './sort.js';
import * as string from './string.js';

const general = {
	...array,
	...cluster,
	...number,
	...sort,
	...string,
};

export { general as default };

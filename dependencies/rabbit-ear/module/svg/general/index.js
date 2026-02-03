/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as algebra from './algebra.js';
import * as dom from './dom.js';
import * as cdata from './cdata.js';
import * as path from './path.js';
import * as transforms from './transforms.js';
import * as viewBox from './viewBox.js';

const general = {
	...algebra,
	...dom,
	...cdata,
	...path,
	...transforms,
	...viewBox,
};

export { general as default };

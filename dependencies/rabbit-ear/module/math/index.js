/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as constant from './constant.js';
import * as convert from './convert.js';
import * as compare from './compare.js';
import * as vector from './vector.js';
import * as matrix2 from './matrix2.js';
import * as matrix3 from './matrix3.js';
import * as matrix4 from './matrix4.js';
import * as quaternion from './quaternion.js';
import * as convexHull from './convexHull.js';
import * as line from './line.js';
import * as nearest from './nearest.js';
import * as plane from './plane.js';
import * as polygon from './polygon.js';
import * as radial from './radial.js';
import * as range from './range.js';
import * as straightSkeleton from './straightSkeleton.js';
import * as triangle from './triangle.js';
import * as encloses from './encloses.js';
import * as overlap from './overlap.js';
import * as intersect from './intersect.js';
import * as clip from './clip.js';

const math = {
	...constant,
	...convert,
	...compare,
	...vector,
	...matrix2,
	...matrix3,
	...matrix4,
	...quaternion,
	...convexHull,
	...line,
	...nearest,
	...plane,
	...polygon,
	...radial,
	...range,
	...straightSkeleton,
	...triangle,
	...encloses,
	...overlap,
	...intersect,
	...clip,
};

export { math as default };

/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';

const cubeRootSigned = (n) => (n < 0
	? -((-n) ** (1 / 3))
	: (n ** (1 / 3))
);
const polynomialSolver = (coefficients) => {
	const [a, b, c, d] = coefficients;
	switch (coefficients.length) {
	case 2: return [-a / b];
	case 3: {
		const discriminant = (b ** 2) - (4 * a * c);
		if (discriminant < -EPSILON) { return []; }
		const q1 = -b / (2 * c);
		if (discriminant < EPSILON) { return [q1]; }
		const q2 = Math.sqrt(discriminant) / (2 * c);
		return [q1 + q2, q1 - q2];
	}
	case 4: {
		const a2 = c / d;
		const a1 = b / d;
		const a0 = a / d;
		const q = (3 * a1 - (a2 ** 2)) / 9;
		const r = (9 * a2 * a1 - 27 * a0 - 2 * (a2 ** 3)) / 54;
		const d0 = (q ** 3) + (r ** 2);
		const u = -a2 / 3;
		if (d0 > 0) {
			const sqrt_d0 = Math.sqrt(d0);
			const s = cubeRootSigned(r + sqrt_d0);
			const t = cubeRootSigned(r - sqrt_d0);
			return [u + s + t];
		}
		if (Math.abs(d0) < EPSILON) {
			if (r < 0) { return []; }
			const s = (r ** (1 / 3));
			return [u + 2 * s, u - s];
		}
		const sqrt_d0 = Math.sqrt(-d0);
		const phi = Math.atan2(sqrt_d0, r) / 3;
		const r_s = ((r ** 2) - d0) ** (1 / 6);
		const s_r = r_s * Math.cos(phi);
		const s_i = r_s * Math.sin(phi);
		return [
			u + 2 * s_r,
			u - s_r - Math.sqrt(3) * s_i,
			u - s_r + Math.sqrt(3) * s_i,
		];
	}
	default: return [];
	}
};

export { polynomialSolver };

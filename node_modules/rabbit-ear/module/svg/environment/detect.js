/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const isBrowser = typeof window === "object"
	&& typeof window.document === "object";
typeof process === "object"
	&& typeof process.versions === "object"
	&& (process.versions.node != null || process.versions.bun != null);

export { isBrowser };

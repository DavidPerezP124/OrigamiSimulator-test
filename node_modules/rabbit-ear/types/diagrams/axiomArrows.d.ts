export function diagramReflectPoint({ vector, origin }: VecLine2, point: [number, number]): [number, number];
export function axiom1Arrows({ vertices_coords }: FOLD, point1: [number, number], point2: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom2Arrows({ vertices_coords }: FOLD, point1: [number, number], point2: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom3Arrows({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom4Arrows({ vertices_coords }: FOLD, line: VecLine2, point: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom5Arrows({ vertices_coords }: FOLD, line: VecLine2, point1: [number, number], point2: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom6Arrows({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, point1: [number, number], point2: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
export function axiom7Arrows({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, point: [number, number], options: {
    vmin?: number;
    padding?: number;
}): Arrow[];
//# sourceMappingURL=axiomArrows.d.ts.map
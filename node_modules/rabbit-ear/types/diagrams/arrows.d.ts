export function arrowFromSegment(points: [number, number][], options?: {
    vmin?: number;
    padding?: number;
}): Arrow;
export function arrowFromSegmentInPolygon(polygon: [number, number][], segment: [number, number][], options?: {
    vmin?: number;
    padding?: number;
}): Arrow;
export function arrowFromLine(polygon: [number, number][], line: VecLine2, options: {
    vmin?: number;
    padding?: number;
}): Arrow;
export function foldLineArrow({ vertices_coords }: FOLD, foldLine: VecLine2, options: {
    vmin?: number;
    padding?: number;
}): Arrow;
//# sourceMappingURL=arrows.d.ts.map
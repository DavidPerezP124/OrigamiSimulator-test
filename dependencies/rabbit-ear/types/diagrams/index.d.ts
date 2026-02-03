declare const _default: {
    diagramReflectPoint: ({ vector, origin }: VecLine2, point: [number, number]) => [number, number];
    axiom1Arrows: ({ vertices_coords }: FOLD, point1: [number, number], point2: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom2Arrows: ({ vertices_coords }: FOLD, point1: [number, number], point2: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom3Arrows: ({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom4Arrows: ({ vertices_coords }: FOLD, line: VecLine2, point: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom5Arrows: ({ vertices_coords }: FOLD, line: VecLine2, point1: [number, number], point2: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom6Arrows: ({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, point1: [number, number], point2: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    axiom7Arrows: ({ vertices_coords }: FOLD, line1: VecLine2, line2: VecLine2, point: [number, number], options: {
        vmin?: number;
        padding?: number;
    }) => Arrow[];
    arrowFromSegment: (points: [number, number][], options?: {
        vmin?: number;
        padding?: number;
    }) => Arrow;
    arrowFromSegmentInPolygon: (polygon: [number, number][], segment: [number, number][], options?: {
        vmin?: number;
        padding?: number;
    }) => Arrow;
    arrowFromLine: (polygon: [number, number][], line: VecLine2, options: {
        vmin?: number;
        padding?: number;
    }) => Arrow;
    foldLineArrow: ({ vertices_coords }: FOLD, foldLine: VecLine2, options: {
        vmin?: number;
        padding?: number;
    }) => Arrow;
};
export default _default;
//# sourceMappingURL=index.d.ts.map
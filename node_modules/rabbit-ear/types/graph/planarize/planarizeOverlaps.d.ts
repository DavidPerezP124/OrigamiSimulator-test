export function planarizeOverlaps({ vertices_coords, vertices_edges, edges_vertices, edges_assignment, edges_foldAngle }: FOLD, epsilon?: number): {
    result: FOLD;
    changes: {
        vertices: {
            map: number[];
        };
        edges: {
            map: number[][];
        };
    };
};
//# sourceMappingURL=planarizeOverlaps.d.ts.map
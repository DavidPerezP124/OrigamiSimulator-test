export function planarizeCollinearEdges({ vertices_coords, edges_vertices, edges_assignment, edges_foldAngle, }: FOLD, epsilon?: number): {
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
//# sourceMappingURL=planarizeCollinearEdges.d.ts.map
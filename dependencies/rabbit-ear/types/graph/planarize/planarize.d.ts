export function planarizeEdgesVerbose(graph: FOLD, epsilon?: number): {
    result: FOLD;
    changes: {
        vertices: {
            map: number[][];
        };
        edges: {
            map: number[][];
        };
    };
};
export function planarizeEdges({ vertices_coords, edges_vertices, edges_assignment, edges_foldAngle, }: FOLD, epsilon?: number): FOLD;
export function planarizeVerbose(graph: FOLD, epsilon?: number): {
    result: FOLD;
    changes: {
        vertices: {
            map: number[][];
        };
        edges: {
            map: number[][];
        };
        faces: {
            map: number[][];
        };
    };
};
export function planarize(graph: FOLD, epsilon?: number): FOLD;
//# sourceMappingURL=planarize.d.ts.map
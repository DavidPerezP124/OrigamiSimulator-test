const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const THREE = require("../dependencies/three.min.js");
const _ = require("../dependencies/underscore-min.js");

class NodeStub {
    constructor(position, index) {
        this._originalPosition = position.clone();
        this.index = index;
        this.creases = [];
        this.invCreases = [];
        this.beams = [];
    }

    addBeam(beam) {
        this.beams.push(beam);
    }

    removeBeam(beam) {
        var index = this.beams.indexOf(beam);
        if (index >= 0) this.beams.splice(index, 1);
    }

    addCrease(crease) {
        this.creases.push(crease);
    }

    removeCrease(crease) {
        var index = this.creases.indexOf(crease);
        if (index >= 0) this.creases.splice(index, 1);
    }

    addInvCrease(crease) {
        this.invCreases.push(crease);
    }

    removeInvCrease(crease) {
        var index = this.invCreases.indexOf(crease);
        if (index >= 0) this.invCreases.splice(index, 1);
    }

    getOriginalPosition() {
        return this._originalPosition.clone();
    }

    setOriginalPosition(x, y, z) {
        this._originalPosition.set(x, y, z);
    }

    getIndex() {
        return this.index;
    }

    destroy() {}
}

class BeamStub {
    constructor(nodes) {
        this.nodes = nodes;
        this.vertices = [nodes[0]._originalPosition, nodes[1]._originalPosition];
        nodes[0].addBeam(this);
        nodes[1].addBeam(this);
        this.recalcOriginalLength();
    }

    getVector(fromNode) {
        if (fromNode === this.nodes[1]) return this.vertices[0].clone().sub(this.vertices[1]);
        return this.vertices[1].clone().sub(this.vertices[0]);
    }

    getLength() {
        return this.getVector().length();
    }

    recalcOriginalLength() {
        this.originalLength = this.getLength();
    }

    destroy() {
        this.nodes[0].removeBeam(this);
        this.nodes[1].removeBeam(this);
    }
}

class CreaseStub {
    constructor(edge, face1Index, face2Index, targetTheta, type, node1, node2, index) {
        this.edge = edge;
        this.face1Index = face1Index;
        this.face2Index = face2Index;
        this.targetTheta = targetTheta;
        this.type = type;
        this.node1 = node1;
        this.node2 = node2;
        this.index = index;
        node1.addCrease(this);
        node2.addCrease(this);
        edge.nodes[0].addInvCrease(this);
        edge.nodes[1].addInvCrease(this);
    }

    destroy() {}
}

function fakeJQuery() {
    return {
        parent: function() { return this; },
        addClass: function() { return this; },
        removeClass: function() { return this; },
        hide: function() { return this; }
    };
}

function loadInitModel() {
    var modelSource = fs.readFileSync(path.join(__dirname, "..", "js", "model.js"), "utf8");
    var context = {
        console: console,
        THREE: THREE,
        _: _,
        Node: NodeStub,
        Beam: BeamStub,
        Crease: CreaseStub,
        $: fakeJQuery
    };
    vm.createContext(context);
    vm.runInContext(modelSource, context, {filename: "model.js"});
    return context.initModel;
}

function makeGlobals() {
    var sceneModels = [];
    return {
        colorMode: "normal",
        color1: "ffffff",
        color2: "000000",
        _sceneModels: sceneModels,
        threeView: {
            sceneAddModel: function(model) {
                sceneModels.push(model);
            },
            simulationRunning: true,
            startAnimation: function() {}
        },
        edgesVisible: true,
        mtnsVisible: true,
        valleysVisible: true,
        panelsVisible: true,
        passiveEdgesVisible: true,
        boundaryEdgesVisible: true,
        meshVisible: true,
        simType: "thick",
        panelThickness: 0.02,
        thickLinkageType: "bennettpaper",
        minHingeGap: 0,
        thickContainingColumnIndex: 2,
        miuraColumnBoost: 0,
        miuraColumnPhase: 1,
        miuraColumnTolerance: 0,
        thickEdgeGapOverrides: {},
        thickEdgeGapScaleOverrides: {},
        thickClearanceEnabled: true,
        thickClearanceCheckStride: 1,
        thickClearanceMaxFaces: 500,
        thickClearanceMaxPairs: 500000,
        thickCollisionEpsilon: 1e-5,
        thickAutoTuneEnabled: true,
        miuraColumnAutoPhase: true,
        thickAutoTuneBoost: true,
        thickAutoTuneBoostStep: 0.005,
        thickAutoTuneMaxBoost: 0.12,
        thickAutoTuneMaxIterations: 12,
        dynamicSolver: {
            syncNodesAndEdges: function() {},
            render: function() {},
            reset: function() {},
            solve: function() {}
        },
        staticSolver: {},
        rigidSolver: {},
        userInteractionEnabled: false,
        vrEnabled: false,
        noCreasePatternAvailable: function() { return false; },
        navMode: "simulation",
        needsSync: false,
        simNeedsSync: false,
        simulationRunning: true,
        panelStiffness: 1,
        creaseStiffness: 1,
        percentDamping: 0
    };
}

function syncModel(model, fold, creaseParams) {
    model.buildModel(fold, creaseParams || []);
    model.sync();
}

function makeTriangulatedSquare(interiorIsPattern, interiorAssignment, interiorAngle) {
    if (interiorAssignment === undefined) interiorAssignment = "F";
    if (interiorAngle === undefined) {
        if (interiorAssignment === "M") interiorAngle = -90;
        else if (interiorAssignment === "V") interiorAngle = 90;
        else interiorAngle = 0;
    }
    return {
        vertices_coords: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
        faces_vertices: [[0, 1, 2], [0, 2, 3]],
        edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]],
        edges_assignment: ["B", "B", "B", "B", interiorAssignment],
        edges_foldAngle: [null, null, null, null, interiorAngle],
        edges_isPattern: [true, true, true, true, interiorIsPattern]
    };
}

function makeTriangulatedSquareWithoutInteriorEdge() {
    return {
        vertices_coords: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
        faces_vertices: [[0, 1, 2], [0, 2, 3]],
        edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0]],
        edges_assignment: ["B", "B", "B", "B"],
        edges_foldAngle: [null, null, null, null],
        edges_isPattern: [true, true, true, true]
    };
}

function makeDisjointTriangles(overlap) {
    var triA = [[0, 0, 0], [1, 0, 0], [0, 0, 1]];
    var triB;
    if (overlap) triB = [[0.2, 0, 0.2], [1.2, 0, 0.2], [0.2, 0, 1.2]];
    else triB = [[2.0, 0, 2.0], [3.0, 0, 2.0], [2.0, 0, 3.0]];

    return {
        vertices_coords: [triA[0], triA[1], triA[2], triB[0], triB[1], triB[2]],
        faces_vertices: [[0, 1, 2], [3, 4, 5]],
        edges_vertices: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]],
        edges_assignment: ["B", "B", "B", "B", "B", "B"],
        edges_foldAngle: [null, null, null, null, null, null],
        edges_isPattern: [true, true, true, true, true, true]
    };
}

function makeFourSpokeVertexFold() {
    return {
        vertices_coords: [
            [0, 0, 0],
            [-1.6, 0, -0.3],
            [0.5, 0, -1.4],
            [1.3, 0, -1.2],
            [-0.3, 0, 1.7]
        ],
        faces_vertices: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1]],
        edges_vertices: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1]],
        edges_assignment: ["M", "M", "M", "M", "B", "B", "B", "B"],
        edges_foldAngle: [-90, -90, -90, -90, null, null, null, null],
        edges_isPattern: [true, true, true, true, true, true, true, true]
    };
}

function topVertexFromFace(thickGeometry, faceIndex, localVertexIndex) {
    var arr = thickGeometry.attributes.position.array;
    var base = faceIndex * 18 + localVertexIndex * 3;
    return new THREE.Vector3(arr[base], arr[base + 1], arr[base + 2]);
}

function bottomVertexFromFace(thickGeometry, faceIndex, localVertexIndex) {
    var arr = thickGeometry.attributes.position.array;
    var base = faceIndex * 18 + (3 + localVertexIndex) * 3;
    return new THREE.Vector3(arr[base], arr[base + 1], arr[base + 2]);
}

function signedInsetDistanceOnEdge(faceVerts, edgeIndices, topEdge, bottomEdge, oppositeVertIndex) {
    var pa = faceVerts[edgeIndices[0]];
    var pb = faceVerts[edgeIndices[1]];
    var pc = faceVerts[oppositeVertIndex];
    var edgeMid = pa.clone().add(pb).multiplyScalar(0.5);
    var edgeDir = pb.clone().sub(pa).normalize();
    var inward = pc.clone().sub(edgeMid);
    inward.sub(edgeDir.clone().multiplyScalar(inward.dot(edgeDir)));
    inward.normalize();
    var topCenter = topEdge[0].clone().add(topEdge[1]).multiplyScalar(0.5);
    var bottomCenter = bottomEdge[0].clone().add(bottomEdge[1]).multiplyScalar(0.5);

    return {
        top: topCenter.sub(edgeMid).dot(inward),
        bottom: bottomCenter.sub(edgeMid).dot(inward)
    };
}

function pointInTriangle2D(p, a, b, c, eps) {
    if (eps === undefined) eps = 1e-6;
    var v0x = c.x - a.x;
    var v0z = c.z - a.z;
    var v1x = b.x - a.x;
    var v1z = b.z - a.z;
    var v2x = p.x - a.x;
    var v2z = p.z - a.z;

    var dot00 = v0x * v0x + v0z * v0z;
    var dot01 = v0x * v1x + v0z * v1z;
    var dot02 = v0x * v2x + v0z * v2z;
    var dot11 = v1x * v1x + v1z * v1z;
    var dot12 = v1x * v2x + v1z * v2z;

    var denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-12) return false;
    var invDenom = 1 / denom;
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= -eps && v >= -eps && (u + v) <= 1 + eps;
}

function applyFoldPercentToTriangulatedSquare(model, foldPercent) {
    var positions = model.getPositionsArray();
    var lift = 0.35 * foldPercent;
    // Mimic a nonzero fold by lifting one triangle and dropping the other.
    positions[1 * 3 + 1] = lift;
    positions[3 * 3 + 1] = -lift;
    model.updateThickPanelGeometry();
}

function getThickMeshFromScene(globals, model) {
    var thickGeometry = model.getThickGeometry();
    for (var i = 0; i < globals._sceneModels.length; i++) {
        var obj = globals._sceneModels[i];
        if (obj instanceof THREE.Mesh && obj.geometry === thickGeometry) return obj;
    }
    return null;
}

test("thick mode uses the same crease set as thin simulation", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);
    var fold = {
        vertices_coords: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
        faces_vertices: [[0, 1, 2], [0, 2, 3]],
        edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]],
        edges_assignment: ["B", "B", "B", "B", "M", "M"],
        edges_foldAngle: [null, null, null, null, -90, -45],
        edges_isPattern: [true, true, true, true, true, false]
    };
    var creaseParams = [
        [0, 1, 1, 3, 4, -90],
        [0, 0, 1, 2, 5, -45]
    ];

    syncModel(model, fold, creaseParams);

    var simCreases = model.getCreases();
    assert.equal(simCreases.length, 2);
    assert.equal(simCreases[0].edge, model.getEdges()[4]);
    assert.equal(simCreases[1].edge, model.getEdges()[5]);
    assert.ok(Math.abs(simCreases[0].targetTheta + Math.PI / 2) < 1e-12);
    assert.ok(Math.abs(simCreases[1].targetTheta + Math.PI / 4) < 1e-12);
});

test("dynamic and thick modes keep identical crease counts for the same model", function() {
    var initModel = loadInitModel();
    var fold = {
        vertices_coords: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
        faces_vertices: [[0, 1, 2], [0, 2, 3]],
        edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]],
        edges_assignment: ["B", "B", "B", "B", "M", "M"],
        edges_foldAngle: [null, null, null, null, -90, -45],
        edges_isPattern: [true, true, true, true, true, false]
    };
    var creaseParams = [
        [0, 1, 1, 3, 4, -90],
        [0, 0, 1, 2, 5, -45]
    ];

    var globalsDynamic = makeGlobals();
    globalsDynamic.simType = "dynamic";
    var modelDynamic = initModel(globalsDynamic);
    syncModel(modelDynamic, fold, creaseParams);

    var globalsThick = makeGlobals();
    globalsThick.simType = "thick";
    var modelThick = initModel(globalsThick);
    syncModel(modelThick, fold, creaseParams);

    assert.equal(modelDynamic.getCreases().length, modelThick.getCreases().length);
});

test("thick geometry removes side walls along non-input interior edges", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(false), []);
    applyFoldPercentToTriangulatedSquare(model, 0.6);

    var indexCount = model.getThickGeometry().index.array.length;
    assert.equal(indexCount, 36);
});

test("thick geometry should stay continuous across non-input facet edges", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.1;
    var model = initModel(globals);
    var fold = {
        vertices_coords: [[0, 0, 0], [2, 0, 0], [2, 0, 1], [0, 0, 1]],
        faces_vertices: [[0, 1, 2], [0, 2, 3]],
        edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]],
        edges_assignment: ["M", "V", "M", "V", "F"],
        edges_foldAngle: [-90, 90, -90, 90, 0],
        edges_isPattern: [true, true, true, true, false]
    };

    syncModel(model, fold, []);

    var thickGeo = model.getThickGeometry();
    // Shared facet edge is [0,2], represented in faces [0,1,2] and [0,2,3].
    // For continuity, duplicate top vertices for v0 and v2 should coincide.
    var v0FaceA = topVertexFromFace(thickGeo, 0, 0);
    var v0FaceB = topVertexFromFace(thickGeo, 1, 0);
    var v2FaceA = topVertexFromFace(thickGeo, 0, 2);
    var v2FaceB = topVertexFromFace(thickGeo, 1, 1);

    assert.ok(v0FaceA.distanceTo(v0FaceB) < 1e-8, "non-input facet edge split at shared vertex v0");
    assert.ok(v2FaceA.distanceTo(v2FaceB) < 1e-8, "non-input facet edge split at shared vertex v2");
});

test("thick geometry removes side walls on interior facet edges even when marked as input pattern", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(true, "F", 0), []);
    applyFoldPercentToTriangulatedSquare(model, 0.6);

    var indexCount = model.getThickGeometry().index.array.length;
    assert.equal(indexCount, 36);
});

test("thick geometry keeps side walls on interior mountain edges marked as input pattern", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(true, "M", -90), []);
    applyFoldPercentToTriangulatedSquare(model, 0.6);

    var indexCount = model.getThickGeometry().index.array.length;
    assert.equal(indexCount, 48);
});

test("thick geometry keeps side walls on interior F edges with nonzero fold angles at flat state", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(true, "F", -90), []);

    var indexCount = model.getThickGeometry().index.array.length;
    assert.equal(indexCount, 48);
});

test("thick geometry treats missing interior triangulation edges as facet splits at nonzero fold percent", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquareWithoutInteriorEdge(), []);
    applyFoldPercentToTriangulatedSquare(model, 0.6);

    var indexCount = model.getThickGeometry().index.array.length;
    assert.equal(indexCount, 36);

    var thickGeo = model.getThickGeometry();
    var v0FaceA = topVertexFromFace(thickGeo, 0, 0);
    var v0FaceB = topVertexFromFace(thickGeo, 1, 0);
    var v2FaceA = topVertexFromFace(thickGeo, 0, 2);
    var v2FaceB = topVertexFromFace(thickGeo, 1, 1);
    assert.ok(v0FaceA.distanceTo(v0FaceB) < 1e-8, "missing interior edge split at shared vertex v0");
    assert.ok(v2FaceA.distanceTo(v2FaceB) < 1e-8, "missing interior edge split at shared vertex v2");
});

test("thick mode should avoid render settings that create visible facet creases", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(true, "F", 0), []);
    applyFoldPercentToTriangulatedSquare(model, 0.6);

    var thickMesh = getThickMeshFromScene(globals, model);
    assert.ok(thickMesh, "thick mesh not found in scene models");
    assert.equal(
        thickMesh.material.flatShading,
        false,
        "flat shading keeps triangulation facets visually creased in thick mode"
    );
});

test("bennettpaper linkage uses simple extrusion without mountain/valley slope", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.08;
    globals.thickLinkageType = "bennettpaper";
    globals.miuraColumnBoost = 0;
    var model = initModel(globals);
    var fold = {
        vertices_coords: [[0, 0, 0], [2, 0, 0], [0, 0, 2]],
        faces_vertices: [[0, 1, 2]],
        edges_vertices: [[0, 1], [1, 2], [2, 0]],
        edges_assignment: ["M", "V", "B"],
        edges_foldAngle: [-90, 90, null],
        edges_isPattern: [true, true, true]
    };

    syncModel(model, fold, []);
    model.updateThickPanelGeometry();

    var face = fold.faces_vertices[0];
    var positions = model.getPositionsArray();
    var faceVerts = [
        new THREE.Vector3(positions[face[0] * 3], positions[face[0] * 3 + 1], positions[face[0] * 3 + 2]),
        new THREE.Vector3(positions[face[1] * 3], positions[face[1] * 3 + 1], positions[face[1] * 3 + 2]),
        new THREE.Vector3(positions[face[2] * 3], positions[face[2] * 3 + 1], positions[face[2] * 3 + 2])
    ];
    var thickGeo = model.getThickGeometry();

    var mountainTop = [topVertexFromFace(thickGeo, 0, 0), topVertexFromFace(thickGeo, 0, 1)];
    var mountainBottom = [bottomVertexFromFace(thickGeo, 0, 0), bottomVertexFromFace(thickGeo, 0, 1)];
    var mountainInset = signedInsetDistanceOnEdge(faceVerts, [0, 1], mountainTop, mountainBottom, 2);

    var valleyTop = [topVertexFromFace(thickGeo, 0, 1), topVertexFromFace(thickGeo, 0, 2)];
    var valleyBottom = [bottomVertexFromFace(thickGeo, 0, 1), bottomVertexFromFace(thickGeo, 0, 2)];
    var valleyInset = signedInsetDistanceOnEdge(faceVerts, [1, 2], valleyTop, valleyBottom, 0);

    assert.ok(
        Math.abs(mountainInset.bottom - mountainInset.top) <= 1e-6,
        "bennettpaper should keep mountain top/bottom inset equal"
    );
    assert.ok(
        Math.abs(valleyInset.bottom - valleyInset.top) <= 1e-6,
        "bennettpaper should keep valley top/bottom inset equal"
    );
});

test("bennettpaper linkage pairs opposite spokes at 4-crease vertices", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.03;
    globals.minHingeGap = 0;
    globals.thickLinkageType = "bennettpaper";
    globals.miuraColumnBoost = 0;
    var model = initModel(globals);
    var fold = makeFourSpokeVertexFold();

    syncModel(model, fold, []);

    var center = fold.vertices_coords[0];
    var spokes = [];
    for (var i = 1; i <= 4; i++) {
        var p = fold.vertices_coords[i];
        spokes.push({
            key: "0_" + i,
            theta: Math.atan2(p[2] - center[2], p[0] - center[0])
        });
    }
    spokes.sort(function(a, b) { return a.theta - b.theta; });

    var insets = model.getThickEdgeInsetMap();
    var inset0 = insets[spokes[0].key];
    var inset1 = insets[spokes[1].key];
    var inset2 = insets[spokes[2].key];
    var inset3 = insets[spokes[3].key];

    assert.ok(Math.abs(inset0 - inset2) < 1e-9, "first opposite spoke pair should match");
    assert.ok(Math.abs(inset1 - inset3) < 1e-9, "second opposite spoke pair should match");

    var pairA = 0.5 * (inset0 + inset2);
    var pairB = 0.5 * (inset1 + inset3);
    assert.ok(
        Math.abs(pairA - pairB) > 1e-3,
        "irregular 4-crease vertex should produce two distinct opposite-pair insets"
    );
});

test("unsupported linkage values fall back to bennettpaper hinge math", function() {
    var initModel = loadInitModel();
    var fold = makeFourSpokeVertexFold();

    var globalsFallback = makeGlobals();
    globalsFallback.thickLinkageType = "creasepair";
    var modelFallback = initModel(globalsFallback);
    syncModel(modelFallback, fold, []);
    var fallbackInsets = modelFallback.getThickEdgeInsetMap();

    var globalsPaper = makeGlobals();
    globalsPaper.thickLinkageType = "bennettpaper";
    var modelPaper = initModel(globalsPaper);
    syncModel(modelPaper, fold, []);
    var paperInsets = modelPaper.getThickEdgeInsetMap();

    var keys = Object.keys(paperInsets).sort();
    assert.deepEqual(Object.keys(fallbackInsets).sort(), keys, "fallback and paper inset keys should match");
    for (var i=0;i<keys.length;i++){
        var key = keys[i];
        assert.ok(
            Math.abs((fallbackInsets[key] || 0) - (paperInsets[key] || 0)) < 1e-10,
            "fallback inset mismatch for edge " + key
        );
    }
});

test("hinge inset remains inside very acute triangles", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.18;
    globals.minHingeGap = 0.18;
    var model = initModel(globals);
    var fold = {
        vertices_coords: [[0, 0, 0], [1, 0, 0], [0.995, 0, 0.02]],
        faces_vertices: [[0, 1, 2]],
        edges_vertices: [[0, 1], [1, 2], [2, 0]],
        edges_assignment: ["M", "M", "B"],
        edges_foldAngle: [-90, -90, null],
        edges_isPattern: [true, true, true]
    };

    syncModel(model, fold, []);
    model.updateThickPanelGeometry();

    var positions = model.getPositionsArray();
    var a = new THREE.Vector3(positions[0], positions[1], positions[2]);
    var b = new THREE.Vector3(positions[3], positions[4], positions[5]);
    var c = new THREE.Vector3(positions[6], positions[7], positions[8]);

    var thickGeo = model.getThickGeometry();
    var b0 = bottomVertexFromFace(thickGeo, 0, 0);
    var b1 = bottomVertexFromFace(thickGeo, 0, 1);
    var b2 = bottomVertexFromFace(thickGeo, 0, 2);

    assert.ok(pointInTriangle2D(b0, a, b, c), "bottom vertex 0 escaped the source face");
    assert.ok(pointInTriangle2D(b1, a, b, c), "bottom vertex 1 escaped the source face");
    assert.ok(pointInTriangle2D(b2, a, b, c), "bottom vertex 2 escaped the source face");
});

test("thick edge gap overrides can raise specific crease insets", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.04;
    var model = initModel(globals);
    var fold = {
        vertices_coords: [[0, 0, 0], [2, 0, 0], [0, 0, 2]],
        faces_vertices: [[0, 1, 2]],
        edges_vertices: [[0, 1], [1, 2], [2, 0]],
        edges_assignment: ["M", "B", "B"],
        edges_foldAngle: [-90, null, null],
        edges_isPattern: [true, true, true]
    };

    syncModel(model, fold, []);

    var baseInset = model.getThickEdgeInsetMap()["0_1"];
    assert.ok(baseInset > 0, "base inset for edge 0_1 should be positive");

    globals.thickEdgeGapScaleOverrides = {"0_1": 2.5};
    model.updateThickPanelGeometry();
    var scaledInset = model.getThickEdgeInsetMap()["0_1"];
    assert.ok(
        scaledInset > baseInset * 2.4,
        "scale override did not increase the target edge inset"
    );

    globals.thickEdgeGapScaleOverrides = {};
    globals.thickEdgeGapOverrides = {"0_1": baseInset + 0.03};
    model.updateThickPanelGeometry();
    var absoluteInset = model.getThickEdgeInsetMap()["0_1"];
    assert.ok(
        absoluteInset >= baseInset + 0.029,
        "absolute override did not enforce the target edge inset"
    );
});

test("thick clearance stats flag overlap between disjoint panels", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.03;
    globals.thickCollisionEpsilon = 1e-4;
    var model = initModel(globals);

    syncModel(model, makeDisjointTriangles(true), []);
    model.updateThickPanelGeometry();

    var stats = model.getThickClearanceStats();
    assert.equal(stats.valid, true, "thick clearance stats should be available");
    assert.equal(stats.skipped, false);
    assert.equal(stats.collision, true, "expected overlapping panels to be flagged");
    assert.ok(stats.minDistance < 1e-5, "overlap should yield near-zero minimum clearance");
});

test("thick clearance stats stay non-colliding for separated disjoint panels", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.panelThickness = 0.03;
    globals.thickCollisionEpsilon = 1e-4;
    var model = initModel(globals);

    syncModel(model, makeDisjointTriangles(false), []);
    model.updateThickPanelGeometry();

    var stats = model.getThickClearanceStats();
    assert.equal(stats.valid, true, "thick clearance stats should be available");
    assert.equal(stats.skipped, false);
    assert.equal(stats.collision, false, "separated panels should not be flagged");
    assert.ok(stats.minDistance > 0.5, "expected a comfortably positive clearance");
});

test("thin area stats track area delta and support reference reset", function() {
    var initModel = loadInitModel();
    var globals = makeGlobals();
    globals.simType = "dynamic";
    var model = initModel(globals);

    syncModel(model, makeTriangulatedSquare(true, "F", 0), []);

    var stats0 = model.getThinAreaStats();
    assert.equal(stats0.valid, true);
    assert.ok(Math.abs(stats0.delta) < 1e-12);

    var positions = model.getPositionsArray();
    positions[3] += 0.25;
    model.step(1);

    var stats1 = model.getThinAreaStats();
    assert.ok(Math.abs(stats1.delta) > 1e-6, "area delta did not react to a geometry change");

    model.resetThinAreaReference();
    var stats2 = model.getThinAreaStats();
    assert.ok(Math.abs(stats2.delta) < 1e-12);
    assert.ok(Math.abs(stats2.deltaPercent) < 1e-9);
});

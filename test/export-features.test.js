const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const THREE = require("../dependencies/three.min.js");

function makeJQueryMock(state) {
    return function(selector) {
        var entry = state[selector];
        if (!entry) {
            return {
                length: 0,
                is: function() { return false; },
                val: function() { return ""; }
            };
        }
        return {
            length: 1,
            is: function(query) {
                if (query === ":checked") return !!entry.checked;
                return false;
            },
            val: function(next) {
                if (arguments.length === 0) return entry.value || "";
                entry.value = next;
                return this;
            }
        };
    };
}

function makeTriangleGeo() {
    var geo = new THREE.BufferGeometry();
    geo.addAttribute("position", new THREE.BufferAttribute(new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
    ]), 3));
    return geo;
}

function makeSquareFaces() {
    return [[0, 1, 2], [0, 2, 3]];
}

function makeSquarePositions() {
    return new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 0, 1,
        0, 0, 1
    ]);
}

function makeModel(options) {
    options = options || {};
    var ensureCalls = 0;
    var updateCalls = 0;
    var thinGeo = options.thinGeo || makeTriangleGeo();
    var thickGeo = options.thickGeo || null;
    var thickExportGeo = options.thickExportGeo || null;

    return {
        counters: {
            ensureCalls: function() { return ensureCalls; },
            updateCalls: function() { return updateCalls; }
        },
        getFaces: function() {
            return options.faces || makeSquareFaces();
        },
        getPositionsArray: function() {
            return options.positions || makeSquarePositions();
        },
        getThickEdgeInsetMap: function() {
            return options.edgeInsetByKey || {};
        },
        getGeometry: function() {
            return thinGeo.clone();
        },
        getThickGeometry: function() {
            return thickGeo ? thickGeo.clone() : null;
        },
        buildThickExportGeometry: options.withThickBuilder ? function() {
            return thickExportGeo ? thickExportGeo.clone() : null;
        } : undefined,
        ensureThickGeometry: function() {
            ensureCalls++;
        },
        updateThickPanelGeometry: function() {
            updateCalls++;
        },
        getDimensions: function() {
            return new THREE.Vector3(2, 1, 2);
        }
    };
}

function makeGlobals(model, overrides) {
    overrides = overrides || {};
    return Object.assign({
        model: model,
        simType: "dynamic",
        panelThickness: 0.02,
        snapPlateThickness: 0,
        snapInterlayerGap: 0,
        snapPinRadius: 0,
        snapPinHeight: 0,
        snapPinClearance: 0,
        snapPinSegments: 16,
        snapExportEnabled: false,
        doublesidedSTL: false,
        doublesidedOBJ: false,
        exportScale: 1,
        scale: 1,
        filename: "default_name",
        warn: function() {}
    }, overrides);
}

function loadExportContext(globals, domState) {
    var source = fs.readFileSync(path.join(__dirname, "..", "js", "saveSTL.js"), "utf8");
    var saveAsCalls = [];
    var stlCalls = [];
    var objParseCalls = [];

    var threeForContext = Object.assign({}, THREE);
    threeForContext.OBJExporter = function() {};
    threeForContext.OBJExporter.prototype.parse = function(mesh) {
        objParseCalls.push(mesh.name || "");
        return "obj:" + (mesh.name || "mesh");
    };

    var context = {
        console: console,
        THREE: threeForContext,
        globals: globals,
        Blob: function(parts, options) {
            this.parts = parts;
            this.options = options || {};
        },
        saveAs: function(blob, filename) {
            saveAsCalls.push({ blob: blob, filename: filename });
        },
        geometryToSTLBin: function(payload) {
            stlCalls.push(payload);
            return new Uint8Array([1, 2, 3]);
        },
        $: makeJQueryMock(domState || {})
    };

    vm.createContext(context);
    vm.runInContext(source, context, { filename: "saveSTL.js" });
    context.__calls = {
        saveAsCalls: saveAsCalls,
        stlCalls: stlCalls,
        objParseCalls: objParseCalls
    };
    return context;
}

function faceCountFromBuffer(bufferGeo) {
    var geo = new THREE.Geometry().fromBufferGeometry(bufferGeo);
    return geo.faces.length;
}

test("isSnapExportEnabled follows checkbox states", function() {
    var model = makeModel();
    var globals = makeGlobals(model, { snapExportEnabled: false });
    var dom = {
        "#snapExportEnabledSTL": { checked: true },
        "#snapExportEnabledOBJ": { checked: false }
    };
    var ctx = loadExportContext(globals, dom);

    assert.equal(ctx.isSnapExportEnabled(), true);
    assert.equal(globals.snapExportEnabled, true);

    dom["#snapExportEnabledSTL"].checked = false;
    dom["#snapExportEnabledOBJ"].checked = false;
    assert.equal(ctx.isSnapExportEnabled(), false);
    assert.equal(globals.snapExportEnabled, false);
});

test("applyExportScaleAndSiding scales triangle coordinates", function() {
    var model = makeModel();
    var globals = makeGlobals(model, { exportScale: 4, scale: 2 });
    var ctx = loadExportContext(globals, {});
    var out = ctx.applyExportScaleAndSiding(makeTriangleGeo(), false);
    var arr = out.attributes.position.array;

    assert.equal(arr[0], 0);
    assert.equal(arr[3], 2);
    assert.equal(arr[7], 2);
});

test("applyExportScaleAndSiding duplicates triangles when doublesided", function() {
    var model = makeModel();
    var globals = makeGlobals(model, { exportScale: 1, scale: 1 });
    var ctx = loadExportContext(globals, {});
    var out = ctx.applyExportScaleAndSiding(makeTriangleGeo(), true);
    var arr = out.attributes.position.array;

    assert.equal(arr.length, 18);
    // back-side winding should be A,C,B
    assert.equal(arr[9], 0);
    assert.equal(arr[10], 0);
    assert.equal(arr[11], 0);
    assert.equal(arr[12], 0);
    assert.equal(arr[13], 1);
    assert.equal(arr[14], 0);
    assert.equal(arr[15], 1);
    assert.equal(arr[16], 0);
    assert.equal(arr[17], 0);
});

test("makeSaveGEO uses thick export geometry when thick sim is active", function() {
    var thinGeo = makeTriangleGeo();
    var thickGeo = new THREE.BufferGeometry();
    thickGeo.addAttribute("position", new THREE.BufferAttribute(new Float32Array([
        0, 0, 0,
        2, 0, 0,
        0, 2, 0
    ]), 3));
    var model = makeModel({
        thinGeo: thinGeo,
        thickExportGeo: thickGeo,
        withThickBuilder: true
    });
    var globals = makeGlobals(model, { simType: "thick", exportScale: 1, scale: 1 });
    var ctx = loadExportContext(globals, {});
    var out = ctx.makeSaveGEO(false);
    var arr = out.attributes.position.array;

    assert.equal(arr[3], 2);
    assert.equal(arr[7], 2);
});

test("snap build keeps connectors even with large manual nonzero clearance", function() {
    var model = makeModel({
        edgeInsetByKey: { "0_2": 0.03 }
    });
    var globals = makeGlobals(model, {
        snapPinClearance: 10,
        snapPinRadius: 0.02,
        snapPinHeight: 0.05,
        snapPlateThickness: 0.02,
        snapInterlayerGap: 0.01
    });
    var ctx = loadExportContext(globals, {});
    var parts = ctx.buildSnapConnectorExportParts();

    assert.ok(parts && parts.lower && parts.upper, "expected snap export geometries");
    assert.ok(faceCountFromBuffer(parts.lower) > 16, "lower geometry missing pin connector features");
    assert.ok(faceCountFromBuffer(parts.upper) > 16, "upper geometry missing hole connector features");
});

test("saveSTL writes one file in non-snap mode", function() {
    var model = makeModel();
    var globals = makeGlobals(model, { simType: "dynamic", filename: "sheet" });
    var dom = {
        "#snapExportEnabledSTL": { checked: false },
        "#snapExportEnabledOBJ": { checked: false },
        "#stlFilename": { value: "" }
    };
    var ctx = loadExportContext(globals, dom);
    ctx.saveSTL();

    assert.equal(model.counters.ensureCalls(), 0);
    assert.equal(model.counters.updateCalls(), 0);
    assert.equal(ctx.__calls.stlCalls.length, 1);
    assert.equal(ctx.__calls.saveAsCalls.length, 1);
    assert.equal(ctx.__calls.saveAsCalls[0].filename, "sheet.stl");
});

test("saveSTL snap export writes two files and refreshes thick inset state", function() {
    var model = makeModel({
        edgeInsetByKey: { "0_2": 0.02 }
    });
    var globals = makeGlobals(model, { simType: "dynamic", filename: "sheet" });
    var dom = {
        "#snapExportEnabledSTL": { checked: true },
        "#snapExportEnabledOBJ": { checked: false },
        "#stlFilename": { value: "custom_stl" }
    };
    var ctx = loadExportContext(globals, dom);
    ctx.saveSTL();

    assert.equal(model.counters.ensureCalls(), 1);
    assert.equal(model.counters.updateCalls(), 1);
    assert.equal(ctx.__calls.stlCalls.length, 2);
    assert.equal(ctx.__calls.saveAsCalls.length, 2);
    assert.equal(ctx.__calls.saveAsCalls[0].filename, "custom_stl_lower_with_pins.stl");
    assert.equal(ctx.__calls.saveAsCalls[1].filename, "custom_stl_upper_with_holes.stl");
});

test("saveOBJ writes one file in non-snap mode", function() {
    var model = makeModel();
    var globals = makeGlobals(model, { simType: "dynamic", filename: "sheet_obj" });
    var dom = {
        "#snapExportEnabledSTL": { checked: false },
        "#snapExportEnabledOBJ": { checked: false },
        "#objFilename": { value: "" }
    };
    var ctx = loadExportContext(globals, dom);
    ctx.saveOBJ();

    assert.equal(ctx.__calls.objParseCalls.length, 1);
    assert.equal(ctx.__calls.saveAsCalls.length, 1);
    assert.equal(ctx.__calls.saveAsCalls[0].filename, "sheet_obj.obj");
});

test("saveOBJ snap export writes two files and refreshes thick inset state", function() {
    var model = makeModel({
        edgeInsetByKey: { "0_2": 0.02 }
    });
    var globals = makeGlobals(model, { simType: "dynamic", filename: "sheet_obj" });
    var dom = {
        "#snapExportEnabledSTL": { checked: false },
        "#snapExportEnabledOBJ": { checked: true },
        "#objFilename": { value: "custom_obj" }
    };
    var ctx = loadExportContext(globals, dom);
    ctx.saveOBJ();

    assert.equal(model.counters.ensureCalls(), 1);
    assert.equal(model.counters.updateCalls(), 1);
    assert.equal(ctx.__calls.objParseCalls.length, 2);
    assert.equal(ctx.__calls.saveAsCalls.length, 2);
    assert.equal(ctx.__calls.saveAsCalls[0].filename, "custom_obj_lower_with_pins.obj");
    assert.equal(ctx.__calls.saveAsCalls[1].filename, "custom_obj_upper_with_holes.obj");
});

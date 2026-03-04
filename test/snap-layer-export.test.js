const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const THREE = require("../dependencies/three.min.js");

function pointInTriangle2D(p, a, b, c, eps) {
    if (eps === undefined) eps = 1e-8;
    var v0x = c.x - a.x;
    var v0y = c.y - a.y;
    var v1x = b.x - a.x;
    var v1y = b.y - a.y;
    var v2x = p.x - a.x;
    var v2y = p.y - a.y;

    var dot00 = v0x * v0x + v0y * v0y;
    var dot01 = v0x * v1x + v0y * v1y;
    var dot02 = v0x * v2x + v0y * v2y;
    var dot11 = v1x * v1x + v1y * v1y;
    var dot12 = v1x * v2x + v1y * v2y;
    var denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-12) return false;
    var invDenom = 1 / denom;
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= -eps && v >= -eps && (u + v) <= 1 + eps;
}

function loadSnapPartBuilder(globals) {
    var source = fs.readFileSync(path.join(__dirname, "..", "js", "saveSTL.js"), "utf8");
    var context = {
        console: console,
        THREE: THREE,
        globals: globals,
        saveAs: function() {},
        geometryToSTLBin: function() { return null; },
        $: function() {
            return {
                length: 0,
                is: function() { return false; },
                val: function() { return ""; }
            };
        }
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: "saveSTL.js" });
    return context.buildSnapConnectorExportParts;
}

function makeGlobals(edgeInsetByKey) {
    return {
        panelThickness: 0.02,
        snapPlateThickness: 0.01,
        snapInterlayerGap: 0.004,
        snapPinRadius: 0.001,
        snapPinHeight: 0.01,
        snapPinClearance: 10, // keep snaps disabled so only panel geometry is analyzed
        snapPinSegments: 8,
        warn: function() {},
        model: {
            getFaces: function() {
                return [[0, 1, 2], [0, 2, 3]];
            },
            getPositionsArray: function() {
                return new Float32Array([
                    0, 0, 0,
                    1, 0, 0,
                    1, 0, 1,
                    0, 0, 1
                ]);
            },
            getThickEdgeInsetMap: function() {
                return edgeInsetByKey || {};
            }
        }
    };
}

function topSurfaceCoversPoint(lowerBufferGeo, point) {
    var pos = lowerBufferGeo.attributes.position;
    if (!pos || !pos.array || pos.array.length === 0) return false;
    var arr = pos.array;
    var maxY = -Infinity;
    for (var i=1; i<arr.length; i+=3){
        if (arr[i] > maxY) maxY = arr[i];
    }

    var eps = 1e-6;
    for (var i=0; i<=arr.length-9; i+=9){
        var y0 = arr[i + 1];
        var y1 = arr[i + 4];
        var y2 = arr[i + 7];
        if (Math.abs(y0 - maxY) > eps || Math.abs(y1 - maxY) > eps || Math.abs(y2 - maxY) > eps) continue;

        var a = {x: arr[i], y: arr[i + 2]};
        var b = {x: arr[i + 3], y: arr[i + 5]};
        var c = {x: arr[i + 6], y: arr[i + 8]};
        if (pointInTriangle2D(point, a, b, c, 1e-7)) return true;
    }
    return false;
}

test("snap layer baseline covers interior diagonal midpoint without insets", function() {
    var globals = makeGlobals({});
    var buildSnapConnectorExportParts = loadSnapPartBuilder(globals);
    var parts = buildSnapConnectorExportParts();
    assert.ok(parts && parts.lower, "expected lower snap geometry");

    var coversMidpoint = topSurfaceCoversPoint(parts.lower, {x: 0.5, y: 0.5});
    assert.equal(coversMidpoint, true, "flat baseline should cover the interior diagonal midpoint");
});

test("snap layer leaves a crease gap at interior diagonal midpoint with insets", function() {
    var globals = makeGlobals({"0_2": 0.05});
    var buildSnapConnectorExportParts = loadSnapPartBuilder(globals);
    var parts = buildSnapConnectorExportParts();
    assert.ok(parts && parts.lower, "expected lower snap geometry");

    var coversMidpoint = topSurfaceCoversPoint(parts.lower, {x: 0.5, y: 0.5});
    assert.equal(coversMidpoint, false, "inset creases should remove material around the interior diagonal");
});

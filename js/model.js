/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
    var hingeLines = new THREE.LineSegments(null, lineMaterial);
    var mountainLines = new THREE.LineSegments(null, lineMaterial);
    var valleyLines = new THREE.LineSegments(null, lineMaterial);
    var cutLines = new THREE.LineSegments(null, lineMaterial);
    var facetLines = new THREE.LineSegments(null, lineMaterial);
    var borderLines = new THREE.LineSegments(null, lineMaterial);

    var lines = {
        U: hingeLines,
        M: mountainLines,
        V: valleyLines,
        C: cutLines,
        F: facetLines,
        B: borderLines
    };

    //extruded view of the folded surface for thickness simulation - every triangle is
    //rendered as an independent rigid slab (per-face extrusion along the face normal), so
    //plates keep square edges and their full thickness at any fold angle, with no miter
    //thinning at sharp creases; tops are color1, undersides color2 via vertex colors
    var thicknessMaterial = new THREE.MeshPhongMaterial({
        flatShading: true,
        vertexColors: THREE.VertexColors,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        polygonOffsetUnits: 1
    });
    var thicknessMesh = new THREE.Mesh(new THREE.BufferGeometry(), thicknessMaterial);
    thicknessMesh.visible = false;
    thicknessMesh.frustumCulled = false;//geometry updates every frame, skip bounding sphere upkeep
    var thickPositions = null;//per face: 3 top vertices then 3 bottom vertices
    var thickColors = null;
    var slabNormals = null;//scratch: unit extrusion normal per face, recomputed every frame
    var slabPanel = null;//face index -> rigid panel index (faces joined by facet creases)
    var slabPanelNormals = null;//scratch: one shared extrusion normal per rigid panel
    var slabPanelMinDot = null;//scratch: worst alignment of a panel face with that normal
    var slabNumPanels = 0;
    //invisible but raycastable stand-in material for the flat mesh while the thick view is
    //shown, so node picking/dragging (3dUI, VRInterface) keeps working on the midsurface
    var raycastProxyMaterial = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    clearGeometries();
    setMeshMaterial();

    function clearGeometries(){

        if (geometry) {
            frontside.geometry = null;
            backside.geometry = null;
            geometry.dispose();
        }

        geometry = new THREE.BufferGeometry();
        frontside.geometry = geometry;
        backside.geometry = geometry;
        // geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        _.each(lines, function(line){
            var lineGeometry = line.geometry;
            if (lineGeometry) {
                line.geometry = null;
                lineGeometry.dispose();
            }

            lineGeometry = new THREE.BufferGeometry();
            line.geometry = lineGeometry;
            // lineGeometry.verticesNeedUpdate = true;
            lineGeometry.dynamic = true;
        });
    }

    globals.threeView.sceneAddModel(frontside);
    globals.threeView.sceneAddModel(backside);
    globals.threeView.sceneAddModel(thicknessMesh);
    _.each(lines, function(line){
        globals.threeView.sceneAddModel(line);
    });

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
    var fold, creaseParams;

    var nextCreaseParams, nextFold;//todo only nextFold, nextCreases?

    var inited = false;

    function setMeshMaterial() {
        var polygonOffset = 0.5;
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                flatShading:true,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
            if (!globals.threeView.simulationRunning) {
                getSolver().render();
                setGeoUpdates();
            }
        } else {
            material = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.FrontSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material2 = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.BackSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
            backside.visible = true;
        }
        frontside.material = material;
        backside.material = material2;
        updateThicknessColors();
        updateMeshVisibility();
    }

    function updateEdgeVisibility(){
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        //the thick view replaces the zero-thickness surface, except in strain/normal
        //color modes which rely on the flat mesh's vertex colors. at zero thickness the
        //slabs would collapse to coincident double sided triangles, so fall back to the
        //flat mesh - which is also how the solver reads a non-positive thickness
        var showThickness = globals.simulateThickness && globals.materialThickness > 0 &&
            globals.colorMode == "color" && globals.meshVisible;
        thicknessMesh.visible = showThickness;
        if (showThickness){
            //keep the flat mesh visible but non-rendering: the raycaster skips invisible
            //objects, and node picking/dragging raycasts against getMesh()
            frontside.material = raycastProxyMaterial;
            frontside.visible = true;
            backside.visible = false;
        } else {
            frontside.material = material;
            frontside.visible = globals.meshVisible;
            backside.visible = globals.colorMode == "color" && globals.meshVisible;
        }
    }

    function getGeometry(){
        return geometry;
    }

    function getMesh(){
        return [frontside, backside];
    }

    function getPositionsArray(){
        return positions;
    }

    function getColorsArray(){
        return colors;
    }

    function pause(){
        globals.threeView.pauseSimulation();
    }

    function resume(){
        globals.threeView.startSimulation();
    }

    function reset(){
        getSolver().reset();
        setGeoUpdates();
    }

    function step(numSteps){
        getSolver().solve(numSteps);
        setGeoUpdates();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
        if (thicknessMesh.visible) updateThicknessGeometry();
    }

    //builds the slab mesh topology: for each face, 3 top vertices, 3 bottom vertices, a top
    //and bottom triangle, and side walls on every edge except the facet creases interior to
    //a rigid panel - those neighbours are coplanar and their slabs already meet there, so
    //walling them would bury a pair of coincident, oppositely wound faces inside the panel
    //and make exported STLs non-manifold. positions are filled in every frame by
    //updateThicknessGeometry, colors are static per topology
    function buildThicknessGeometry(){
        var numFaces = faces.length;
        var numSlabVertices = numFaces*6;

        thickPositions = new Float32Array(numSlabVertices*3);
        thickColors = new Float32Array(numSlabVertices*3);
        slabNormals = new Float32Array(numFaces*3);

        //mark the edge slots that sit inside a rigid panel (shared via a facet crease), and
        //group those faces into panels so they can share one extrusion normal
        var parent = [];
        for (var i=0;i<numFaces;i++) parent.push(i);
        function find(a){
            while (parent[a] != a){
                parent[a] = parent[parent[a]];
                a = parent[a];
            }
            return a;
        }

        var noWall = {};//edge slots that must not get a side wall
        var numSkippedWalls = 0;
        function skipWall(faceIndex, slot){
            if (noWall[faceIndex*3+slot]) return;
            noWall[faceIndex*3+slot] = true;
            numSkippedWalls++;
        }
        //the slot of the edge running between two nodes of a face, or -1
        function edgeSlot(faceIndex, n1, n2){
            var face = faces[faceIndex];
            if (!face) return -1;
            for (var j=0;j<3;j++){
                var a = face[j], b = face[(j+1)%3];
                if ((a == n1 && b == n2) || (a == n2 && b == n1)) return j;
            }
            return -1;
        }

        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            if (crease.type != 0) continue;//hinges are handled with the connectors below
            var n1 = crease.edge.nodes[0].getIndex();
            var n2 = crease.edge.nodes[1].getIndex();
            var creaseFaces = [crease.face1Index, crease.face2Index];
            if (faces[creaseFaces[0]] && faces[creaseFaces[1]]){
                parent[find(creaseFaces[0])] = find(creaseFaces[1]);
            }
            for (var s=0;s<2;s++){
                var slot = edgeSlot(creaseFaces[s], n1, n2);
                if (slot >= 0) skipWall(creaseFaces[s], slot);
            }
        }

        slabPanel = new Int32Array(numFaces);
        var panelIds = {};
        slabNumPanels = 0;
        for (var i=0;i<numFaces;i++){
            var root = find(i);
            if (panelIds[root] === undefined) panelIds[root] = slabNumPanels++;
            slabPanel[i] = panelIds[root];
        }
        slabPanelNormals = new Float32Array(slabNumPanels*3);
        slabPanelMinDot = new Float32Array(slabNumPanels);

        //offset panels sit at different heights in the stack, so the two plates of a hinge no
        //longer meet at the crease. collect the corner slots on each side so a connector - the
        //"extension" of the offset panel technique - can be emitted to bridge them, otherwise
        //the model renders as loose floating plates and exports as a non-solid. only built
        //when a layer solution exists, which is exactly when the offsets are ever applied
        var connectors = [];
        if (globals.thickness && globals.thickness.getLayerSolution()){
            for (var i=0;i<creases.length;i++){
                var crease = creases[i];
                if (crease.type == 0) continue;//facet creases stay coplanar within a panel
                var f = crease.face1Index, g = crease.face2Index;
                if (!faces[f] || !faces[g]) continue;
                var n1 = crease.edge.nodes[0].getIndex();
                var n2 = crease.edge.nodes[1].getIndex();
                var cf1 = faces[f].indexOf(n1), cf2 = faces[f].indexOf(n2);
                var cg1 = faces[g].indexOf(n1), cg2 = faces[g].indexOf(n2);
                if (cf1 < 0 || cf2 < 0 || cg1 < 0 || cg2 < 0) continue;
                connectors.push([6*f+cf1, 6*f+cf2, 6*g+cg1, 6*g+cg2]);
                //the connector's own walls close both slabs here. leaving the slab end walls
                //in as well would put three triangles on the shared edge - slab face, slab
                //wall and connector ribbon - making the exported solid non-manifold
                var sf = edgeSlot(f, n1, n2), sg = edgeSlot(g, n1, n2);
                if (sf >= 0) skipWall(f, sf);
                if (sg >= 0) skipWall(g, sg);
            }
        }

        var numWalls = numFaces*3 - numSkippedWalls;
        var IndexArrayType = numSlabVertices > 65535 ? Uint32Array : Uint16Array;
        //top + bottom + 2 triangles per wall + 8 triangles per connector box
        var thickIndices = new IndexArrayType((numFaces*2 + numWalls*2 + connectors.length*8)*3);
        var index = 0;
        for (var i=0;i<numFaces;i++){
            var top = 6*i;
            var bottom = 6*i+3;
            thickIndices[index++] = top;
            thickIndices[index++] = top+1;
            thickIndices[index++] = top+2;
            thickIndices[index++] = bottom;//reversed winding so the underside faces out
            thickIndices[index++] = bottom+2;
            thickIndices[index++] = bottom+1;
            for (var j=0;j<3;j++){//outward-facing side walls
                if (noWall[3*i+j]) continue;
                var k = (j+1)%3;
                thickIndices[index++] = top+j;
                thickIndices[index++] = bottom+j;
                thickIndices[index++] = bottom+k;
                thickIndices[index++] = top+j;
                thickIndices[index++] = bottom+k;
                thickIndices[index++] = top+k;
            }
        }

        //connector boxes: bridge the two plates of each hinge across their stack offset. the
        //four corners on each side (top/bottom at each end of the crease) form a box, closed
        //by a top ribbon, a bottom ribbon and a cap at each end of the crease line
        for (var i=0;i<connectors.length;i++){
            var f1 = connectors[i][0], f2 = connectors[i][1];//face1 top slots at crease nodes 1,2
            var g1 = connectors[i][2], g2 = connectors[i][3];//face2 top slots at the same nodes
            var quads = [
                [f1, f2, g2, g1],//top ribbon
                [f1+3, g1+3, g2+3, f2+3],//bottom ribbon, reversed so it faces out
                [f1, g1, g1+3, f1+3],//cap at crease node 1
                [f2, f2+3, g2+3, g2]//cap at crease node 2, reversed
            ];
            for (var q=0;q<4;q++){
                var quad = quads[q];
                thickIndices[index++] = quad[0];
                thickIndices[index++] = quad[1];
                thickIndices[index++] = quad[2];
                thickIndices[index++] = quad[0];
                thickIndices[index++] = quad[2];
                thickIndices[index++] = quad[3];
            }
        }

        var thickGeometry = new THREE.BufferGeometry();
        thickGeometry.dynamic = true;
        thickGeometry.addAttribute('position', new THREE.BufferAttribute(thickPositions, 3));
        thickGeometry.addAttribute('color', new THREE.BufferAttribute(thickColors, 3));
        thickGeometry.setIndex(new THREE.BufferAttribute(thickIndices, 1));
        var oldGeometry = thicknessMesh.geometry;
        thicknessMesh.geometry = thickGeometry;
        if (oldGeometry) oldGeometry.dispose();
        updateThicknessColors();
    }

    function updateThicknessColors(){
        if (!thickColors) return;
        var color1 = new THREE.Color("#" + globals.color1);
        var color2 = new THREE.Color("#" + globals.color2);
        for (var i=0;i<thickColors.length/3;i+=6){
            for (var j=0;j<3;j++){//plate tops get the front color, undersides the back color
                thickColors[3*(i+j)] = color1.r;
                thickColors[3*(i+j)+1] = color1.g;
                thickColors[3*(i+j)+2] = color1.b;
                thickColors[3*(i+j+3)] = color2.r;
                thickColors[3*(i+j+3)+1] = color2.g;
                thickColors[3*(i+j+3)+2] = color2.b;
            }
        }
        if (thicknessMesh.geometry.attributes.color) thicknessMesh.geometry.attributes.color.needsUpdate = true;
    }

    //extrudes each face of the current folded surface into a rigid slab: the face's three
    //vertices are offset +/- thickness/2 along the extrusion normal, giving plates with
    //square edges that keep their full thickness at any fold angle (no miter thinning).
    //every triangle of a rigid panel is extruded along one shared normal, so the offset
    //vertices along their common edges coincide exactly even when the panel flexes a little
    //under finite panel stiffness - which is what lets the interior walls be omitted
    //without opening a seam in the exported solid
    function updateThicknessGeometry(){
        if (!thickPositions || !positions) return;
        var numFaces = faces.length;
        var halfThickness = 0.5*globals.materialThickness*globals.scale;//pattern units -> render units

        //area weighted mean normal per rigid panel (the cross product length is twice the
        //triangle area, so accumulating it unnormalized weights larger facets more)
        slabPanelNormals.fill(0);
        for (var i=0;i<numFaces;i++){
            var a = faces[i][0], b = faces[i][1], c = faces[i][2];
            var abx = positions[3*b]-positions[3*a], aby = positions[3*b+1]-positions[3*a+1], abz = positions[3*b+2]-positions[3*a+2];
            var acx = positions[3*c]-positions[3*a], acy = positions[3*c+1]-positions[3*a+1], acz = positions[3*c+2]-positions[3*a+2];
            var nx = aby*acz-abz*acy, ny = abz*acx-abx*acz, nz = abx*acy-aby*acx;
            slabNormals[3*i] = nx;//unnormalized, kept for the degenerate panel fallback
            slabNormals[3*i+1] = ny;
            slabNormals[3*i+2] = nz;
            var p = 3*slabPanel[i];
            slabPanelNormals[p] += nx;
            slabPanelNormals[p+1] += ny;
            slabPanelNormals[p+2] += nz;
        }
        for (var i=0;i<slabNumPanels;i++){
            var length = Math.sqrt(slabPanelNormals[3*i]*slabPanelNormals[3*i] +
                slabPanelNormals[3*i+1]*slabPanelNormals[3*i+1] + slabPanelNormals[3*i+2]*slabPanelNormals[3*i+2]);
            if (length > 0){
                slabPanelNormals[3*i] /= length;
                slabPanelNormals[3*i+1] /= length;
                slabPanelNormals[3*i+2] /= length;
            }
            slabPanelMinDot[i] = 1;
        }

        //offsetting along the shared normal would thin a flexed facet to
        //thickness*dot(panelNormal, faceNormal) measured normal to its own plane. divide
        //that cosine back out using the panel's worst-aligned face, so every face of the
        //panel is at least the requested thickness (exactly it when the panel is planar,
        //and the offset stays common to the panel so the welded seams hold)
        for (var i=0;i<numFaces;i++){
            var faceLength = Math.sqrt(slabNormals[3*i]*slabNormals[3*i] +
                slabNormals[3*i+1]*slabNormals[3*i+1] + slabNormals[3*i+2]*slabNormals[3*i+2]);
            if (faceLength <= 0) continue;//degenerate triangle
            var panel = slabPanel[i];
            var dot = (slabNormals[3*i]*slabPanelNormals[3*panel] +
                slabNormals[3*i+1]*slabPanelNormals[3*panel+1] +
                slabNormals[3*i+2]*slabPanelNormals[3*panel+2])/faceLength;
            if (dot < slabPanelMinDot[panel]) slabPanelMinDot[panel] = dot;
        }
        for (var i=0;i<slabNumPanels;i++){
            //a panel bent past 120 degrees would send the correction to infinity, so cap it
            if (!(slabPanelMinDot[i] > 0.5)) slabPanelMinDot[i] = 0.5;
        }

        //offset panel construction: each panel's plate is shifted off the midsurface by its
        //own height in the folded stack, so panels no longer share a hinge centerline and can
        //close fully flat. zero when the pattern has no orderable flat-folded state, which
        //leaves the plates centered on the midsurface and the fold angle limits in force
        var offsetPanels = globals.thickness ? globals.thickness.offsetPanelsActive() : false;

        for (var i=0;i<numFaces;i++){
            var a = faces[i][0], b = faces[i][1], c = faces[i][2];
            var panel = slabPanel[i];
            var p = 3*panel;
            var ux = slabPanelNormals[p], uy = slabPanelNormals[p+1], uz = slabPanelNormals[p+2];//unit
            if (ux == 0 && uy == 0 && uz == 0){//panel normals cancelled, fall back to this face
                var fallback = Math.sqrt(slabNormals[3*i]*slabNormals[3*i] +
                    slabNormals[3*i+1]*slabNormals[3*i+1] + slabNormals[3*i+2]*slabNormals[3*i+2]);
                if (fallback > 0){
                    ux = slabNormals[3*i]/fallback;
                    uy = slabNormals[3*i+1]/fallback;
                    uz = slabNormals[3*i+2]/fallback;
                }
            }
            var scale = halfThickness/slabPanelMinDot[panel];
            var nx = ux*scale, ny = uy*scale, nz = uz*scale;
            //pattern units -> render units, along the same normal the plate is extruded on
            var shift = offsetPanels ? globals.thickness.getFaceOffset(i)*globals.scale : 0;
            var sx = ux*shift, sy = uy*shift, sz = uz*shift;
            var corners = [a, b, c];
            for (var j=0;j<3;j++){
                var v = corners[j];
                var top = 3*(6*i+j);
                var bottom = 3*(6*i+j+3);
                thickPositions[top] = positions[3*v] + sx + nx;
                thickPositions[top+1] = positions[3*v+1] + sy + ny;
                thickPositions[top+2] = positions[3*v+2] + sz + nz;
                thickPositions[bottom] = positions[3*v] + sx - nx;
                thickPositions[bottom+1] = positions[3*v+1] + sy - ny;
                thickPositions[bottom+2] = positions[3*v+2] + sz - nz;
            }
        }

        //note: plates are NOT trimmed against each other at hinges. two slabs hinged about
        //their shared midsurface edge do overlap in a thin wedge along the crease line, and
        //the textbook fix is to trim both to the bisector plane of the dihedral. that trim
        //cannot be expressed by moving these 6 vertices though: at a corner where two
        //mitered edges meet, the correct solid is the intersection of both half spaces,
        //while displacing the shared vertex along both edge directions extends it past its
        //neighbors instead - measured on the flapping bird, a vertex-displacement miter
        //introduced 7-11 vertex penetrations at 70-100% folded where untrimmed slabs had
        //none. doing it properly means convex-clipping each slab against every neighbor
        //plane with variable output topology; until then square slabs are the more accurate
        //of the two, and the residual hinge wedge is documented in the readme.
        thicknessMesh.geometry.attributes.position.needsUpdate = true;
        thicknessMesh.geometry.computeVertexNormals();
        thicknessMesh.geometry.attributes.normal.needsUpdate = true;
    }

    function updateThicknessView(){
        updateMeshVisibility();
        if (thicknessMesh.visible) updateThicknessGeometry();
    }

    //for exports: the per-face slab geometry matching the on-screen thick view,
    //refreshed from the current fold state even if the thick view is hidden
    function getThicknessGeometry(){
        updateThicknessGeometry();
        return thicknessMesh.geometry;
    }

    function startSolver(){
        globals.threeView.startAnimation();
    }

    function getSolver(){
        if (globals.simType == "dynamic") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }




    function buildModel(fold, creaseParams){

        if (fold.vertices_coords.length == 0) {
            globals.warn("No geometry found.");
            return;
        }
        if (fold.faces_vertices.length == 0) {
            globals.warn("No faces found, try adjusting import vertex merge tolerance.");
            return;
        }
        if (fold.edges_vertices.length == 0) {
            globals.warn("No edges found.");
            return;
        }

        nextFold = fold;
        nextCreaseParams = creaseParams;

        globals.needsSync = true;
        globals.simNeedsSync = true;

        if (!inited) {
            startSolver();//start animation loop
            inited = true;
        }
    }



    function sync(){

        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        fold = nextFold;
        nodes = [];
        edges = [];
        faces = fold.faces_vertices;
        creases = [];
        creaseParams = nextCreaseParams;
        var _edges = fold.edges_vertices;

        var _vertices = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            _vertices.push(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
        }

        for (var i=0;i<_vertices.length;i++){
            nodes.push(new Node(_vertices[i].clone(), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<_edges.length;i++) {
            edges.push(new Beam([nodes[_edges[i][0]], nodes[_edges[i][1]]]));
        }

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            creases.push(new Crease(
                edges[_creaseParams[4]],
                _creaseParams[0],
                _creaseParams[2],
                _creaseParams[5] * Math.PI / 180,  // convert back to radians for the GPU math
                type,
                nodes[_creaseParams[1]],
                nodes[_creaseParams[3]],
                creases.length));
        }

        //estimate how many material layers each hinge spans in the flat-folded state and
        //each hinge's panel depth, used to limit fold angles when thickness simulation is on
        if (globals.thickness) globals.thickness.assignLayerGaps(creases, faces, nodes);

        vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getOriginalPosition());
        }

        if (globals.noCreasePatternAvailable() && globals.navMode == "pattern"){
            //switch to simulation mode
            $("#navSimulation").parent().addClass("open");
            $("#navPattern").parent().removeClass("open");
            $("#svgViewer").hide();
            globals.navMode = "simulation";
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        indices = new Uint16Array(faces.length*3);

        for (var i=0;i<vertices.length;i++){
            positions[3*i] = vertices[i].x;
            positions[3*i+1] = vertices[i].y;
            positions[3*i+2] = vertices[i].z;
        }
        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            indices[3*i] = face[0];
            indices[3*i+1] = face[1];
            indices[3*i+2] = face[2];
        }

        clearGeometries();

        var positionsAttribute = new THREE.BufferAttribute(positions, 3);

        var lineIndices = {
            U: [],
            V: [],
            M: [],
            B: [],
            F: [],
            C: []
        };
        for (var i=0;i<fold.edges_assignment.length;i++){
            var edge = fold.edges_vertices[i];
            var assignment = fold.edges_assignment[i];
            lineIndices[assignment].push(edge[0]);
            lineIndices[assignment].push(edge[1]);
        }
        _.each(lines, function(line, key){
            var indicesArray = lineIndices[key];
            var indices = new Uint16Array(indicesArray.length);
            for (var i=0;i<indicesArray.length;i++){
                indices[i] = indicesArray[i];
            }
            lines[key].geometry.addAttribute('position', positionsAttribute);
            lines[key].geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            // lines[key].geometry.attributes.position.needsUpdate = true;
            // lines[key].geometry.index.needsUpdate = true;
            lines[key].geometry.computeBoundingBox();
            lines[key].geometry.computeBoundingSphere();
            lines[key].geometry.center();
        });

        geometry.addAttribute('position', positionsAttribute);
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        // geometry.attributes.position.needsUpdate = true;
        // geometry.index.needsUpdate = true;
        // geometry.verticesNeedUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.center();

        var scale = 1/geometry.boundingSphere.radius;
        globals.scale = scale;

        //scale geometry
        for (var i=0;i<positions.length;i++){
            positions[i] *= scale;
        }
        for (var i=0;i<vertices.length;i++){
            vertices[i].multiplyScalar(scale);
        }

        //update vertices and edges
        for (var i=0;i<vertices.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
        for (var i=0;i<edges.length;i++){
            edges[i].recalcOriginalLength();
        }

        buildThicknessGeometry();

        updateEdgeVisibility();
        updateMeshVisibility();
        if (thicknessMesh.visible) updateThicknessGeometry();

        syncSolver();

        globals.needsSync = false;
        if (!globals.simulationRunning) reset();
    }

    function syncSolver(){
        getSolver().syncNodesAndEdges();
        globals.simNeedsSync = false;
    }

    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
    }

    function getFaces(){
        return faces;
    }

    function getCreases(){
        return creases;
    }

    //true when an export would use the thick slab geometry rather than the midsurface. shared
    //by makeSaveGEO and getDimensions so the reported size cannot drift from the saved file
    function exportUsesThickness(){
        if (globals.thickenModel && globals.thickenOffset > 0) return false;//legacy thickening wins
        return globals.simulateThickness && globals.materialThickness > 0;
    }

    function getDimensions(){
        var source = exportUsesThickness() ? getThicknessGeometry() : geometry;
        source.computeBoundingBox();
        return source.boundingBox.max.clone().sub(source.boundingBox.min);
    }

    return {
        pause: pause,
        resume: resume,
        reset: reset,
        step: step,

        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        getGeometry: getGeometry,//for save stl
        getThicknessGeometry: getThicknessGeometry,//for save stl with thickness simulation on
        exportUsesThickness: exportUsesThickness,//which of the two the export will pick
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,
        getMesh: getMesh,

        buildModel: buildModel,//load new model
        sync: sync,//update geometry to new model
        syncSolver: syncSolver,//update solver params

        //rendering
        setMeshMaterial: setMeshMaterial,
        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility,
        updateThicknessView: updateThicknessView,

        getDimensions: getDimensions//for save stl
    }
}
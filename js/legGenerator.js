/**
 * Leg pattern generator (ported from leg.ipynb).
 * Builds FOLD data in JS and pushes it straight into the simulator.
 */
function initLegGenerator(globals){

    const defaults = {
        numSegments: 5,
        convergeAngle: 5,
        innerAngleDev: 2,
        innerLineColor: "red",
        totalWidth: 15,
        totalHeight: 3,
        autoUpdate: true
    };

    const state = Object.assign({}, defaults);

    function deg2rad(d){ return d * Math.PI / 180; }

    function solveIntersection(x0, y0, angleDeg, H, caRad, top){
        const angleRad = deg2rad(angleDeg);
        const dx = Math.cos(angleRad);
        const dy = Math.sin(angleRad);
        const slope = top ? -Math.tan(caRad) : Math.tan(caRad);
        const intercept = top ? H : -H;
        const denom = dy - slope * dx;
        if (Math.abs(denom) < 1e-12) return null;
        const t = (intercept + slope * x0 - y0) / denom;
        if (t < 0) return null;
        return { x: x0 + t * dx, y: y0 + t * dy };
    }

    function colorToAssignment(color){
        const c = (color || "").trim().toLowerCase();
        if (c === "#000" || c === "#000000" || c === "black") return {assignment:"B", stroke:color};
        if (c === "#ff0000" || c === "#f00" || c === "red") return {assignment:"M", stroke:color};
        if (c === "#0000ff" || c === "#00f" || c === "blue") return {assignment:"V", stroke:color};
        if (c === "#00ff00" || c === "#0f0" || c === "green") return {assignment:"C", stroke:color};
        if (c === "#ffff00" || c === "#ff0" || c === "yellow") return {assignment:"F", stroke:color};
        if (c === "#ff00ff" || c === "#f0f" || c === "magenta") return {assignment:"U", stroke:color};
        // default to mountain/red
        return {assignment:"M", stroke: color || "red"};
    }

    function getIndex(p, verts){
        const key = (p)=>`${p.x.toFixed(6)},${p.y.toFixed(6)}`;
        const vmap = verts._map || (verts._map = new Map());
        const k = key(p);
        if (vmap.has(k)) return vmap.get(k);
        const id = verts.length;
        vmap.set(k, id);
        verts.push([p.x, p.y]); // 2D; y mapped to z later
        return id;
    }

    function addEdge(verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges, p1, p2, assignment, strokeOverride, hidden){
        const i1 = getIndex(p1, verts);
        const i2 = getIndex(p2, verts);
        edges_vertices.push([i1, i2]);
        edges_assignment.push(assignment);
        // Provide target angles so the simulator folds immediately.
        if (assignment === "M") edges_foldAngle.push(-180);
        else if (assignment === "V") edges_foldAngle.push(180);
        else edges_foldAngle.push(null);
        // Rendering stroke
        let stroke = strokeOverride || "#000";
        if (!strokeOverride){
            if (assignment === "M") stroke = "#ff0000";
            else if (assignment === "V") stroke = "#0000ff";
        }
        renderEdges.push({p1, p2, stroke, hidden: !!hidden});
    }

    function buildFold(params){
        const numSegments = Math.max(1, Math.round(params.numSegments));
        const convergeAngle = params.convergeAngle;
        const innerAngleDev = params.innerAngleDev;
        const innerLineColor = params.innerLineColor;
        const totalWidth = params.totalWidth;
        const totalHeight = params.totalHeight;

        const H = totalHeight / 2;
        const caRad = deg2rad(convergeAngle);

        const xCoords = [];
        for (let i = 0; i <= numSegments; i++){
            xCoords.push(totalWidth * i / numSegments);
        }

        const topAngles = [];
        const bottomAngles = [];
        for (let i = 0; i < numSegments; i++){
            if (i % 2 === 0){
                topAngles.push(90 + innerAngleDev);
                bottomAngles.push(270 - innerAngleDev);
            } else {
                topAngles.push(90 - innerAngleDev);
                bottomAngles.push(270 + innerAngleDev);
            }
        }

        const topInts = [];
        const bottomInts = [];
        for (let i = 0; i < numSegments; i++){
            const x = xCoords[i];
            topInts.push(solveIntersection(x, 0, topAngles[i], H, caRad, true));
            bottomInts.push(solveIntersection(x, 0, bottomAngles[i], H, caRad, false));
        }

        if (topInts.some(v=>!v) || bottomInts.some(v=>!v)) {
            globals.warn("Leg generator: intersection failed for current parameters.");
            return null;
        }
        let minX = Math.min(...topInts.map(p=>p.x), ...bottomInts.map(p=>p.x));
        let maxX = Math.max(...topInts.map(p=>p.x), ...bottomInts.map(p=>p.x));

        const verts = [];
        const edges_vertices = [];
        const edges_assignment = [];
        const edges_foldAngle = [];

        const renderEdges = [];

        // top/bottom boundary lines (visible, as in notebook)
        for (let i=0;i<topInts.length-1;i++){
            addEdge(verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges, topInts[i], topInts[i+1], "B", null, false);
        }
        for (let i=0;i<bottomInts.length-1;i++){
            addEdge(verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges, bottomInts[i], bottomInts[i+1], "B", null, false);
        }

        // midline vertices (match notebook: use only first numSegments x-coords)
        const mids = xCoords.slice(0, numSegments).map(x=>({x, y:0}));

        // middle horizontal segments (one fewer than numSegments)
        for (let i = 0; i < numSegments - 1; i++){
            const assignment = (i % 2 === 0) ? "V" : "M"; // blue/valley then red/mountain
            addEdge(
                verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges,
                mids[i],
                mids[i+1],
                assignment
            );
        }

        // angled lines (first/last are black like notebook)
        const innerInfo = colorToAssignment(innerLineColor);
        for (let i = 0; i < numSegments; i++){
            const t = topInts[i];
            const b = bottomInts[i];
            if (!t || !b) continue;
            const isEnd = (i === 0 || i === numSegments - 1);
            const assignment = isEnd ? "B" : innerInfo.assignment;
            const stroke = isEnd ? "#000" : innerInfo.stroke;
            addEdge(verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges, mids[i], t, assignment, stroke, false);
            addEdge(verts, edges_vertices, edges_assignment, edges_foldAngle, renderEdges, mids[i], b, assignment, stroke, false);
        }

        const fold = {
            file_spec: 1.1,
            file_creator: "legGenerator",
            file_title: "leg-generated",
            vertices_coords: (delete verts._map, verts),
            edges_vertices,
            edges_assignment,
            edges_foldAngle
        };

        const vTop = topInts.map(p=>getIndex(p, verts));
        const vBot = bottomInts.map(p=>getIndex(p, verts));
        const vMid = mids.map(p=>getIndex(p, verts));
        const faces = [];
        for (let i=0;i<numSegments-1;i++){
            const fTop = [vTop[i], vTop[i+1], vMid[i+1], vMid[i]];
            const fBot = [vMid[i], vMid[i+1], vBot[i+1], vBot[i]];
            [fTop, fBot].forEach(face=>{
                let area = 0;
                for (let k=0;k<face.length;k++){
                    const a = verts[face[k]], b = verts[face[(k+1)%face.length]];
                    area += a[0]*b[1] - b[0]*a[1];
                }
                if (area < 0) face.reverse();
                faces.push(face);
            });
        }
        // cap faces at left and right so boundaries participate in faces
        const leftFace = [vTop[0], vMid[0], vBot[0]];
        const rightFace = [vTop[vTop.length-1], vBot[vBot.length-1], vMid[vMid.length-1]];
        [leftFace, rightFace].forEach(face=>{
            let area = 0;
            for (let k=0;k<face.length;k++){
                const a = verts[face[k]], b = verts[face[(k+1)%face.length]];
                area += a[0]*b[1] - b[0]*a[1];
            }
            if (area < 0) face.reverse();
            faces.push(face);
        });
        fold.faces_vertices = faces;

        return {fold, renderEdges, verts};
    }

    function buildSVG(renderEdges, verts){
        if (!renderEdges.length) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        verts.forEach(([x,y])=>{
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        // Match leg.ipynb (matplotlib) export geometry:
        // fig: 8x8 in @ 72 dpi => 576x576 pt; default subplot params + aspect='equal' box.
        const pad = 0.5;
        const xMin = minX - pad;
        const xMax = maxX + pad;
        const yMin = minY - pad;
        const yMax = maxY + pad;
        const xRange = xMax - xMin;
        const yRange = yMax - yMin;

        const figW = 576;
        const figH = 576;
        const axes = {
            x0: figW * 0.125,
            y0: figH * 0.11,
            w: figW * 0.775,
            h: figH * 0.77
        };
        const scale = Math.min(axes.w / xRange, axes.h / yRange);
        const drawW = xRange * scale;
        const drawH = yRange * scale;
        const drawX0 = axes.x0 + (axes.w - drawW) / 2;
        const drawY0 = axes.y0 + (axes.h - drawH) / 2;

        function toSvgX(x){
            return drawX0 + (x - xMin) * scale;
        }
        function toSvgY(y){
            // SVG y grows downward; matplotlib flips y so higher values are higher on page.
            return drawY0 + (yMax - y) * scale;
        }

        const strokeWidth = 2;
        let lines = '';
        renderEdges.forEach(e=>{
            const opacity = e.hidden ? 0 : 1;
            lines += `<line x1="${toSvgX(e.p1.x)}" y1="${toSvgY(e.p1.y)}" x2="${toSvgX(e.p2.x)}" y2="${toSvgY(e.p2.y)}" stroke="${e.stroke}" stroke-width="${strokeWidth}" stroke-linecap="square" stroke-opacity="${opacity}" />`;
        });
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${figW}pt" height="${figH}pt" viewBox="0 0 ${figW} ${figH}">${lines}</svg>`;
    }

    function generateAndSet(customParams){
        const params = Object.assign({}, state, customParams || {});
        const res = buildFold(params);
        if (!res){
            globals.warn("Leg generator: no valid intersections for these parameters.");
            return null;
        }
        const svg = buildSVG(res.renderEdges, res.verts);
        if (!svg){
            globals.warn("Leg generator: failed to build SVG.");
            return null;
        }
        globals.filename = "leg-generated";
        globals.extension = "svg";
        globals.url = null;
        globals.pattern.loadSVG(URL.createObjectURL(new Blob([svg], {type:"image/svg+xml"})));
        console.log("legGenerator svg summary", {
            numSegments: state.numSegments,
            verts: res.verts.length,
            edges: res.renderEdges.length
        });
        return res.fold;
    }

    // --- UI wiring ---
    function bindUI(){
        const panel = $("#legGeneratorPanel");
        if (!panel.length) return;

        function readNumber(id, fallback){
            const val = parseFloat($(id).val());
            return isNaN(val) ? fallback : val;
        }

        function readState(){
            state.numSegments = Math.max(1, Math.round(readNumber("#legSegments", state.numSegments)));
            state.convergeAngle = readNumber("#legConvergeAngle", state.convergeAngle);
            state.innerAngleDev = readNumber("#legInnerAngleDev", state.innerAngleDev);
            state.totalWidth = readNumber("#legTotalWidth", state.totalWidth);
            state.totalHeight = readNumber("#legTotalHeight", state.totalHeight);
            state.innerLineColor = $("#legInnerLineColor").val() || state.innerLineColor;
            state.autoUpdate = $("#legAutoUpdate").is(":checked");
        }

        function updateAndMaybeRun(){
            readState();
            if (state.autoUpdate) generateAndSet();
        }

        panel.find("input").on("input change", updateAndMaybeRun);
        $("#legGenerateButton").on("click", function(e){
            e.preventDefault();
            readState();
            generateAndSet();
        });

        // initial render with defaults
        $("#legSegments").val(state.numSegments);
        $("#legConvergeAngle").val(state.convergeAngle);
        $("#legInnerAngleDev").val(state.innerAngleDev);
        $("#legTotalWidth").val(state.totalWidth);
        $("#legTotalHeight").val(state.totalHeight);
        $("#legInnerLineColor").val(state.innerLineColor);
        $("#legAutoUpdate").prop("checked", state.autoUpdate);
        generateAndSet();
    }

    // delay binding until DOM ready
    $(function(){ bindUI(); });

    return {
        defaults,
        generateAndSet
    };
}

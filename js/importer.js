/**
 * Created by amandaghassaei on 5/6/17.
 */

function initImporter(globals){

    var reader = new FileReader();
    let monitoredFolderHandle = null; // Handle to the monitored folder
    let importedFiles = new Set(); // Set to keep track of imported files
    const pollingInterval = 5000; // Poll every 5 seconds

    function importDemoFile(url){
        var extension = url.split(".");
        var name = extension[extension.length-2].split("/");
        name = name[name.length-1];
        extension = extension[extension.length-1];
        // globals.setCreasePercent(0);
        if (extension == "svg"){
            globals.url = url;
            globals.filename = name;
            globals.extension = extension;
            if (!globals.includeCurves) {
                globals.pattern.loadSVG("assets/" + url, true);
            } else {
                globals.curvedFolding.loadSVG("assets/" + url, true);
            }
        } else if (extension == "fold"){
                globals.url = url;
                globals.filename = name;
                globals.extension = extension;
                $.getJSON("assets/" + url, undefined, function (fold) {
                    globals.pattern.setFoldData(fold, true);
                });
        } else {
            console.warn("unknown extension: " + extension);
        }
    }

    // Function to handle folder selection
    async function selectFolder() {
        if ('showDirectoryPicker' in window) {
            try {
                // Prompt user to select a directory
                const dirHandle = await window.showDirectoryPicker();
                monitoredFolderHandle = dirHandle;
                importedFiles = new Set(); // Reset the imported files set
                console.log(`Monitoring folder: ${dirHandle.name}`);

                // Start monitoring the folder
                monitorFolder();
            } catch (err) {
                console.error("Folder selection canceled or failed.", err);
            }
        } else {
            alert("Your browser does not support the File System Access API. Please use a Chromium-based browser like Chrome or Edge.");
        }
    }

    // Function to monitor the selected folder for new SVG files
    async function monitorFolder() {
        if (!monitoredFolderHandle) return;

        // Initial scan
        await scanFolder();

        // Set up periodic scanning
        setInterval(async () => {
            await scanFolder();
        }, pollingInterval);
    }

    // Function to scan the folder for new SVG files
    async function scanFolder() {
        try {
            for await (const [name, handle] of monitoredFolderHandle.entries()) {
                if (handle.kind === 'file' && name.toLowerCase().endsWith('.svg')) {
                    if (!importedFiles.has(name)) {
                        console.log(`New SVG detected: ${name}`);
                        await importSVGFile(handle, name);
                        importedFiles.add(name);
                        // Uncomment the next line if you want to import only the first new file per scan
                        // break;
                    }
                }
            }
        } catch (err) {
            console.error("Error scanning folder:", err);
        }
    }

    // Function to import an SVG file
    async function importSVGFile(fileHandle, fileName) {
        try {
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            // Update globals
            globals.url = url;
            globals.filename = fileName;
            globals.extension = 'svg';

            // Directly import the SVG without showing a modal
            if (!globals.includeCurves) {
                globals.pattern.loadSVG(url, true);
            } else {
                globals.curvedFolding.loadSVG(url, true);
            }

            // Revoke the object URL after import to free memory
            URL.revokeObjectURL(url);

            console.log(`Imported SVG: ${fileName}`);
        } catch (err) {
            console.error(`Error importing SVG file ${fileName}:`, err);
        }
    }

    // Adobe Illustrator and Cuttle.xyz copy vector shapes as SVG string. By
    // listening for a paste event, we can turn the SVG string into a Blob
    // to load it as the pattern. After this paste handler, it has the same code
    // path as selecting a local file.
    window.addEventListener('paste', function (e) {
        console.log("paste");
        // Make a synthetic svg file from text
        var text = e.clipboardData.getData('text/plain');
        if (text.includes("<svg")) {
            var blob = new Blob([text], {type: 'image/svg+xml'});

            globals.url = null;
            globals.filename = "paste";
            globals.extension = "svg";

            reader.onload = function () {

                $("#vertTol").val(globals.vertTol);
                $("#importSettingsModal").modal("show");
                $('#doSVGImport').unbind("click").click(function (e) {
                    e.preventDefault();
                    $('#doSVGImport').unbind("click");
                    if (!globals.includeCurves) {
                        globals.pattern.loadSVG(reader.result);    
                    } else {
                        globals.curvedFolding.loadSVG(reader.result);
                    }
                    // Revoke the object URL after import to free memory
                    URL.revokeObjectURL(reader.result);
                });
            }
            reader.readAsDataURL(blob);
        }
    });

    function openFile(file) {
        var extension = file.name.split(".");
        var name = extension[0];
        extension = extension[extension.length - 1];

        if (extension == "svg") {
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    $("#vertTol").val(globals.vertTol);
                    $("#importSettingsModal").modal("show");
                    $('#doSVGImport').unbind("click").click(function (e) {
                        e.preventDefault();
                        $('#doSVGImport').unbind("click");
                        globals.filename = name;
                        globals.extension = extension;
                        globals.url = null;
                        if (!globals.includeCurves) {
                            globals.pattern.loadSVG(reader.result);    
                        } else {
                            globals.curvedFolding.loadSVG(reader.result);
                        }
                        // Revoke the object URL after import to free memory
                        URL.revokeObjectURL(reader.result);
                    });
                }
            }(file);
            reader.readAsDataURL(file);
        } else if (extension == "fold"){
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    globals.filename = name;
                    globals.extension = extension;
                    globals.url = null;

                    try {
                        var fold = JSON.parse(reader.result);
                        if (!fold || !fold.vertices_coords || !fold.edges_assignment || !fold.edges_vertices || !fold.faces_vertices){
                            globals.warn("Invalid FOLD file, must contain all of: <br/>" +
                                "<br/>vertices_coords<br/>edges_vertices<br/>edges_assignment<br/>faces_vertices");
                            return;
                        }

                        // spec 1.0 backwards compatibility
                        if (fold.edges_foldAngles){
                            fold.edges_foldAngle = fold.edges_foldAngles;
                            delete fold.edges_foldAngles;
                        }
                        if (fold.edges_foldAngle){
                            globals.pattern.setFoldData(fold, true);
                            return;
                        }
                        $("#importFoldModal").modal("show");
                        $('#importFoldModal').on('hidden.bs.modal', function () {
                            $('#importFoldModal').off('hidden.bs.modal');
                            if (globals.foldUseAngles) {//todo this should all go to pattern.js
                                globals.setCreasePercent(1);
                                var foldAngles = [];
                                for (var i=0;i<fold.edges_assignment.length;i++){
                                    var assignment = fold.edges_assignment[i];
                                    if (assignment == "F") foldAngles.push(0);
                                    else foldAngles.push(null);
                                }
                                fold.edges_foldAngle = foldAngles;

                                var allCreaseParams = globals.pattern.setFoldData(fold, false, true);
                                var j = 0;
                                var faces = globals.pattern.getTriangulatedFaces();
                                for (var i=0;i<fold.edges_assignment.length;i++){
                                    var assignment = fold.edges_assignment[i];
                                    if (assignment !== "M" && assignment !== "V" && assignment !== "F") continue;
                                    var creaseParams = allCreaseParams[j];
                                    var face1 = faces[creaseParams[0]];
                                    var vec1 = makeVector(fold.vertices_coords[face1[1]]).sub(makeVector(fold.vertices_coords[face1[0]]));
                                    var vec2 = makeVector(fold.vertices_coords[face1[2]]).sub(makeVector(fold.vertices_coords[face1[0]]));
                                    var normal1 = (vec2.cross(vec1)).normalize();
                                    var face2 = faces[creaseParams[2]];
                                    vec1 = makeVector(fold.vertices_coords[face2[1]]).sub(makeVector(fold.vertices_coords[face2[0]]));
                                    vec2 = makeVector(fold.vertices_coords[face2[2]]).sub(makeVector(fold.vertices_coords[face2[0]]));
                                    var normal2 = (vec2.cross(vec1)).normalize();
                                    var angle = Math.abs(normal1.angleTo(normal2));
                                    if (assignment == "M") angle *= -1;
                                    fold.edges_foldAngle[i] = angle * 180 / Math.PI;
                                    creaseParams[5] = fold.edges_foldAngle[i];
                                    j++;
                                }
                                globals.model.buildModel(fold, allCreaseParams);
                                return;
                            }
                            var foldAngles = [];
                            for (var i=0;i<fold.edges_assignment.length;i++){
                                var assignment = fold.edges_assignment[i];
                                if (assignment == "M") foldAngles.push(-180);
                                else if (assignment == "V") foldAngles.push(180);
                                else if (assignment == "F") foldAngles.push(0);
                                else foldAngles.push(null);
                            }
                            fold.edges_foldAngle = foldAngles;
                            globals.pattern.setFoldData(fold);
                        });
                    } catch(err) {
                        globals.warn("Unable to parse FOLD json.");
                        console.log(err);
                    }
                }
            }(file);
            reader.readAsText(file);
        } else {
            globals.warn('Unknown file extension: .' + extension);
            return null;
        }
    }

    // Add event listener for "Select Folder" button
    document.getElementById('select-folder-button').addEventListener('click', selectFolder);

    // Existing drag-and-drop handlers
    window.addEventListener('drop', function(e) {
        e.preventDefault();
        if (e.dataTransfer.items) {
            for (item of e.dataTransfer.items) {
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    openFile(file)
                    break;
                }
            }
        } else {
            for (item of e.dataTransfer.files) {
                openFile(file)
                break;
            }
        }
    });

    window.addEventListener('dragover', function(e) {
        e.preventDefault();
    }, false);

    window.addEventListener('message', function(e) {
        if (!e.data) return;
        if (e.data.op === 'importFold' && e.data.fold) {
            globals.filename = e.data.fold.file_title || 'message';
            globals.extension = 'fold';
            globals.url = null;
            globals.pattern.setFoldData(e.data.fold);
        } else if (e.data.op === 'importSVG' && e.data.svg) {
            globals.filename = e.data.filename || 'message';
            globals.extension = 'svg';
            globals.url = null;
            if (e.data.vertTol) {
                globals.vertTol = e.data.vertTol;
            }
            if (!globals.includeCurves) {
                globals.pattern.loadSVG(URL.createObjectURL(new Blob([e.data.svg])));
            } else {
                globals.curvedFolding.loadSVG(URL.createObjectURL(new Blob([e.data.svg])));
            }
        }
    });
    // Tell parent/opening window that we're ready for messages now.
    var readyMessage = {from: 'OrigamiSimulator', status: 'ready'};
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(readyMessage, '*');
    } else if (window.opener) {
        window.opener.postMessage(readyMessage, '*');
    }

    $("#fileSelector").change(function(e) {
        var files = e.target.files; // FileList object
        if (files.length < 1) {
            return;
        }
        openFile(files[0])
        $(e.target).val("");
    });

    function makeVector(v){
        if (v.length == 2) return makeVector2(v);
        return makeVector3(v);
    }
    function makeVector2(v){
        return new THREE.Vector2(v[0], v[1]);
    }
    function makeVector3(v){
        return new THREE.Vector3(v[0], v[1], v[2]);
    }

    function warnUnableToLoad(){
        globals.warn("Unable to load file.");
    }

    return {
        importDemoFile: importDemoFile
    }
}

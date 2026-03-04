/**
 * Created by ghassaei on 10/7/16.
 */

function initControls(globals){

    window.addEventListener('resize', function(){
        if (globals.capturer) return;
        globals.threeView.onWindowResize();
        updateCanvasDimensions();
    }, false);

    $("#logo").mouseenter(function(){
        $("#activeLogo").show();
        $("#inactiveLogo").hide();
    });
    $("#logo").mouseleave(function(){
        $("#inactiveLogo").show();
        $("#activeLogo").hide();
    });

    $(".author").hover(function(e){
        var $target = $(e.target);
        var $moreInfo = $("#authorMoreInfo");
        if (!$target.hasClass("demo")) {
            $moreInfo.hide();
            return;
        }
        var offset = $target.position();
        var width = $target.outerWidth();
        if (width == 0) {
            $moreInfo.hide();
            return;
        }

        var author = $target.data("author");
        $("#authorContent").children().hide();
        $("#authorContent>#" + author).show();

        $moreInfo.css({top:offset.top-13+"px", left:width+"px"});
        $moreInfo.show();
        $target.parent().append($moreInfo);
    });
    $(".author").mouseout(function(e){
        var $moreInfo = $("#authorMoreInfo");
        if ($(e.target).parent().is(":hover")) return;
        if ($moreInfo.is(":hover")) return;
        $moreInfo.hide();
    });
    $("#authorMoreInfo").mouseout(function(e){
        var $moreInfo = $("#authorMoreInfo");
        if ($moreInfo.is(":hover")) return;
        if ($moreInfo.find("#element:hover").length>0) return;
        $moreInfo.hide();
    });

    setLink("#menuVis", function(){
        if (globals.menusVisible){
            $("#controls").fadeOut();
            $("#controlsLeft").fadeOut();
            $("#creasePercentNav").fadeIn();
        } else {
            $("#controls").fadeIn();
            $("#controlsLeft").fadeIn();
            $("#creasePercentNav").fadeOut();
        }
        globals.menusVisible = !globals.menusVisible;
    });
    $("#controls").fadeIn();

    setLink("#about", function(){
        $('#aboutModal').modal('show');
    });
    setLink("#aboutCorner", function(){
        $('#aboutModal').modal('show');
    });
    setLink("#tips", function(){
        $('#tipsModal').modal('show');
    });
    setLink("#aboutAnimation", function(){
        $('#aboutAnimationModal').modal('show');
    });

    setLink("#cameraX", function(){
        globals.threeView.setCameraX(1);
    });
    setLink("#cameraY", function(){
        globals.threeView.setCameraY(1);
    });
    setLink("#cameraZ", function(){
        globals.threeView.setCameraZ(1);
    });
    setLink("#cameraMinusX", function(){
        globals.threeView.setCameraX(-1);
    });
    setLink("#cameraMinusY", function(){
        globals.threeView.setCameraY(-1);
    });
    setLink("#cameraMinusZ", function(){
        globals.threeView.setCameraZ(-1);
    });
    setLink("#cameraIso", function(){
        globals.threeView.setCameraIso();
    });

    setLink("#exportFOLD", function(){
        updateDimensions();
        $("#foldFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
        var units = globals.foldUnits;
        if (units == "unit") units = "unitless";
        $(".unitsDisplay").html(units);
        $('#exportFOLDModal').modal('show');
    });
    setLink("#exportSTL", function(){
        updateDimensions();
        $("#stlFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
        $('#exportSTLModal').modal('show');
    });
    setLink("#exportOBJ", function(){
        updateDimensions();
        $("#objFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
        $('#exportOBJModal').modal('show');
    });
    setInput(".exportScale", globals.exportScale, function(val){
        globals.exportScale = val;
        updateDimensions();
    }, 0);
    function updateDimensions(){
        var dim = globals.model.getDimensions();
        dim.multiplyScalar(globals.exportScale/globals.scale);
        $(".exportDimensions").html(dim.x.toFixed(2) + " x " + dim.y.toFixed(2) + " x " + dim.z.toFixed(2));
    }
    setCheckbox("#doublesidedSTL", globals.doublesidedSTL, function(val){
        globals.doublesidedSTL = val;
    });
    setCheckbox("#doublesidedOBJ", globals.doublesidedOBJ, function(val){
        globals.doublesidedOBJ = val;
    });
    function setSnapExportEnabled(val){
        globals.snapExportEnabled = val;
        $("#snapExportEnabledSTL").prop("checked", val);
        $("#snapExportEnabledOBJ").prop("checked", val);
    }
    setCheckbox("#snapExportEnabledSTL", globals.snapExportEnabled, function(val){
        setSnapExportEnabled(val);
    });
    setCheckbox("#snapExportEnabledOBJ", globals.snapExportEnabled, function(val){
        setSnapExportEnabled(val);
    });
    setInput(".snapPlateThickness", globals.snapPlateThickness, function(val){
        globals.snapPlateThickness = val;
    }, 0);
    setInput(".snapInterlayerGap", globals.snapInterlayerGap, function(val){
        globals.snapInterlayerGap = val;
    }, 0);
    setInput(".snapPinRadius", globals.snapPinRadius, function(val){
        globals.snapPinRadius = val;
    }, 0);
    setInput(".snapPinHeight", globals.snapPinHeight, function(val){
        globals.snapPinHeight = val;
    }, 0);
    setInput(".snapPinClearance", globals.snapPinClearance, function(val){
        globals.snapPinClearance = val;
    }, 0);
    setCheckbox("#polyFacesOBJ", globals.polyFacesOBJ, function(val){
        globals.polyFacesOBJ = val;
    });
    setLink(".units", function(e){
        var units = $(e.target).data("id");
        globals.foldUnits = units;
        if (units == "unit") units = "unitless";
        $(".unitsDisplay").html(units);
    });
    setCheckbox("#triangulateFOLDexport", globals.triangulateFOLDexport, function(val){
        globals.triangulateFOLDexport = val;
    });
    setCheckbox("#exportFoldAngle", globals.exportFoldAngle, function(val){
        globals.exportFoldAngle = val;
    });

    setLink("#doSTLsave", function(){
        saveSTL();
    });
    setLink("#doOBJsave", function(){
        saveOBJ();
    });
    setLink("#doFOLDsave", function(){
        saveFOLD();
    });

    setLink("#rotateX", function(){
        globals.threeView.resetModel();
        globals.rotateModel = "x";
    });
    setLink("#rotateY", function(){
        globals.threeView.resetModel();
        globals.rotateModel = "y";
    });
    setLink("#rotateZ", function(){
        globals.threeView.resetModel();
        globals.rotateModel = "z";
    });
    setLink("#stopRotation", function(){
        globals.rotateModel = null;
        globals.threeView.resetModel();
    });
    setLink("#changeRotationSpeed", function(){
        $("#changeRotationSpeedModal").modal("show");
    });
    setInput("#rotationSpeed", globals.rotationSpeed, function(val){
        globals.rotationSpeed = val;
    });

    setLink("#changeBackground", function(){
        $("#changeBackgroundModal").modal("show");
    });
    setHexInput("#backgroundColor", globals.backgroundColor, function(val){
        globals.backgroundColor = val;
        globals.threeView.setBackgroundColor();
    });

    setLink("#importSettings", function(){
        $("#vertTol").val(globals.vertTol);
        $("#curvedLines").val(globals.includeCurves);
        $("#vertInt").val(globals.vertInt);
        $("#apprCurve").val(globals.apprCurve);
        $("#importSettingsModal").modal("show");
    });
    setInput("#vertTol", globals.vertTol, function(val){
        globals.vertTol = val;
    });
    setCheckbox("#curvedLines", globals.includeCurves, function(val){
        globals.includeCurves = val;
        if (val) $("#curvedCreaseImportOptions").show();
        else $("#curvedCreaseImportOptions").hide();
    });
    if (globals.includeCurves) $("#curvedCreaseImportOptions").show();
    else $("#curvedCreaseImportOptions").hide();
    setInput("#vertInt", globals.vertInt, function(val){
        globals.vertInt = val;
    });
    setInput("#apprCurve", globals.apprCurve, function(val){
        globals.apprCurve = val;
    });

    setLink("#createGif", function(){
        globals.shouldScaleCanvas = true;
        $("#screenCaptureModal .video").hide();
        $("#screenCaptureModal .png").hide();
        $("#screenCaptureModal .gif").show();
        $("#screenCaptureModal").modal("show");
        $("#screenRecordFilename").val(globals.filename);
        globals.screenRecordFilename = globals.filename;
        globals.threeView.onWindowResize();
        updateCanvasDimensions();
    });
    setLink("#createPNG", function(){
        globals.shouldScaleCanvas = true;
        $("#screenCaptureModal .gif").hide();
        $("#screenCaptureModal .video").hide();
        $("#screenCaptureModal .png").show();
        $("#screenCaptureModal").modal("show");
        $("#screenRecordFilename").val(globals.filename);
        globals.screenRecordFilename = globals.filename;
        globals.threeView.onWindowResize();
        updateCanvasDimensions();
    });
    setLink("#createVideo", function(){
        var hasWebP = false;
        (function() {
          var img = new Image();
          img.onload = function() {
            hasWebP = !!(img.height > 0 && img.width > 0);
              if (hasWebP){
                  //timeLimit: s of video to limit
                $("#screenCaptureModal .gif").hide();
                $("#screenCaptureModal .png").hide();
                $("#screenCaptureModal .video").show();
                $("#screenCaptureModal").modal("show");
                $("#screenRecordFilename").val(globals.filename);
                globals.screenRecordFilename = globals.filename;
              } else {
                  globals.warn("Video export not supported by this browser, please try again " +
                "with the latest version of Google Chrome.");
              }
          };
          img.onerror = function() {
             globals.warn("Video export not supported by this browser, please try again " +
                "with the latest version of Google Chrome.");
          };
          img.src = '../assets/support/test.webp';
        })();

    });
    $("#screenCaptureModal").on('hidden.bs.modal', function (){
        if (globals.capturer) return;
        globals.shouldScaleCanvas = false;
        globals.threeView.onWindowResize();
    });
    $("#screenCaptureModal").on('shown.bs.modal', function (){
        globals.shouldScaleCanvas = true;//fixes problem of setting animation turning off shouldScaleCanvas
        globals.threeView.onWindowResize();
        updateCanvasDimensions();
    });
    setInput("#capturerFPS", globals.capturerFPS, function(val){
        globals.capturerFPS = val;
    }, 0, 60);
    setInput("#gifFPS", globals.gifFPS, function(val){
        globals.gifFPS = val;
    }, 0, 60);
    setInput("#capturerQuality", globals.capturerQuality, function(val){
        globals.capturerQuality = val;
    }, 0, 63);
    setInput("#capturerScale", globals.capturerScale, function(val){
        globals.capturerScale = val;
        globals.threeView.onWindowResize();
        updateCanvasDimensions();
    }, 1);
    function updateCanvasDimensions(){
        var dim = (new THREE.Vector2(window.innerWidth, window.innerHeight)).multiplyScalar(globals.capturerScale);
        $("#canvasDimensions").html(dim.x + " x " + dim.y + " px");
    }
    setInput("#screenRecordFilename", "OrigamiSimulator", function(val){
        globals.screenRecordFilename = val;
    });

    setLink("#doScreenRecord", function(){
        globals.capturerFrames = 0;
        globals.capturer = new CCapture({
            format:'webm',
            name:globals.screenRecordFilename,
            framerate:globals.capturerFPS,
            workersPath:'dependencies/',
            quality: globals.capturerQuality
        });
        globals.currentFPS = globals.capturerFPS;
        globals.isGif = false;
        $("#recordStatus").show();
        globals.shouldScaleCanvas = false;
        globals.threeView.resetModel();
        globals.capturer.start();
        if (globals.videoAnimator.isValid()) {
            globals.shouldAnimateFoldPercent = true;
            globals.videoAnimator.compile();
        }
    });
    setLink("#doPNGCapture", function(){
        globals.shouldScaleCanvas = false;
        globals.capturer = "png";
    });
    setLink("#doGifRecord", function(){
        globals.capturerFrames = 0;
        globals.capturer = new CCapture({
            format:'gif',
            name:globals.screenRecordFilename,
            framerate:globals.gifFPS,
            workersPath:'dependencies/'
        });
        globals.currentFPS = globals.gifFPS;
        globals.isGif = true;
        $("#recordStatus").show();
        globals.shouldScaleCanvas = false;
        globals.threeView.resetModel();
        globals.capturer.start();
        if (globals.videoAnimator.isValid()) {
            globals.shouldAnimateFoldPercent = true;
            globals.videoAnimator.compile();
        }
    });

    setLink("#stopRecord", function(){
        if (!globals.capturer) return;
        if (globals.isGif) globals.warn("Processing GIF, may take a few minutes...  <br/>(you can close this window in the meantime)<br/><br/> GIFs exported from this app are not highly compressed, " +
            "you can decrease their file size using a GIF editor.  " +
            "I like <a href='https://ezgif.com/video-to-gif' target='blank'>EZGif</a>.");
        else {
            globals.warn("Compiling WebM video.  If you have trouble playing videos exported from this app, try using " +
                "<a href='http://www.videolan.org/vlc/index.html' target='blank'>VLC Player</a>.");
        }
        globals.capturer.stop();
        globals.capturer.save();
        globals.capturer = null;
        globals.shouldScaleCanvas = false;
        globals.shouldAnimateFoldPercent = false;
        globals.threeView.onWindowResize();
        $("#recordStatus").hide();
    });


    setLink("#navPattern", function(){
        if (globals.noCreasePatternAvailable()){
            globals.warn("No crease pattern available.");
            return;
        }
        if (globals.navMode == "pattern") return;
        globals.pausedForPatternView = globals.simulationRunning;
        globals.model.pause();
        globals.navMode = "pattern";
        $("#navPattern").parent().addClass("open");
        $("#navSimulation").parent().removeClass("open");
        $("#svgViewer").show();
    });
    $("#navSimulation").parent().addClass("open");
    $("#navPattern").parent().removeClass("open");
    setLink("#navSimulation", function(){
        if (globals.navMode == "simulation") return;
        globals.navMode = "simulation";
        if (globals.pausedForPatternView) globals.model.resume();
        $("#navSimulation").parent().addClass("open");
        $("#navPattern").parent().removeClass("open");
        $("#svgViewer").hide();
    });

    setLink(".seeMore", function(e){
        var $target = $(e.target);
        if (!$target.hasClass("seeMore")) $target = $target.parent();
        var $div = $("#"+ $target.data("id"));
        if ($target.hasClass("closed")){
            $target.removeClass("closed");
            $target.addClass("open");
            AnimateRotate(-90, 0, $target.children("span"));
            $div.removeClass("hide");
            $div.css('display', 'inline-block');
        } else {
            $target.removeClass("open");
            $target.addClass("closed");
            AnimateRotate(0, -90, $target.children("span"));
            $div.hide();
        }
    });

    function AnimateRotate(from, to, $elem) {
        // we use a pseudo object for the animation
        // (starts from `0` to `angle`), you can name it as you want
        $({deg: from}).animate({deg: to}, {
            duration: 200,
            step: function(now) {
                // in the step-callback (that is fired each step of the animation),
                // you can use the `now` paramter which contains the current
                // animation-position (`0` up to `angle`)
                $elem.css({
                    transform: 'rotate(' + now + 'deg)'
                });
            }
        });
    }

    setLink(".goToImportInstructions", function(){
       $("#aboutModal").modal("hide");
        $("#importSettingsModal").modal("hide");
        $("#tipsModal").modal("show");
    });

    setLink("#goToViveInstructions", function(){
       $("#aboutModal").modal("hide");
        $("#aboutVRmodal").modal("show");
    });

    setRadio("integrationType", globals.integrationType, function(val){
        globals.dynamicSolver.reset();
        globals.integrationType = val;
    });


    function updateThickPanelUI(){
        if (globals.simType == "thick") $("#thickPanelSettings").show();
        else $("#thickPanelSettings").hide();
    }

    function normalizeMiuraPhase(phase){
        var parsed = parseInt(phase, 10);
        if (!isFinite(parsed)) parsed = 1;
        return ((parsed % 2) + 2) % 2;
    }

    if (globals.thickAutoTuneEnabled === undefined) globals.thickAutoTuneEnabled = true;
    if (globals.miuraColumnAutoPhase === undefined) globals.miuraColumnAutoPhase = true;
    if (globals.thickAutoTuneBoost === undefined) globals.thickAutoTuneBoost = true;
    globals.miuraColumnPhase = normalizeMiuraPhase(globals.miuraColumnPhase);

    function updateThinAreaStats(stats, isThinMode){
        if (!isThinMode || !stats || !stats.valid){
            $("#thinAreaCurrent").html("--");
            $("#thinAreaReference").html("--");
            $("#thinAreaDelta").html("--");
            $("#thinAreaDeltaPercent").html("--");
            return;
        }
        var deltaSign = stats.delta >= 0 ? "+" : "";
        var percentSign = stats.deltaPercent >= 0 ? "+" : "";
        $("#thinAreaCurrent").html(stats.current.toFixed(6));
        $("#thinAreaReference").html(stats.reference.toFixed(6));
        $("#thinAreaDelta").html(deltaSign + stats.delta.toFixed(6));
        $("#thinAreaDeltaPercent").html(percentSign + stats.deltaPercent.toFixed(2) + "%");
    }

    function updateThickAutoTuneState(stats, isThickMode){
        if (!isThickMode){
            $("#thickMiuraPhaseState").html("--");
            $("#thickMiuraBoostState").html("--");
            return;
        }
        var manualPhase = normalizeMiuraPhase(globals.miuraColumnPhase);
        var autoPhaseEnabled = globals.miuraColumnAutoPhase !== false && globals.thickAutoTuneEnabled !== false;
        var tunedPhase = manualPhase;
        if (stats && stats.phase !== null && stats.phase !== undefined){
            tunedPhase = normalizeMiuraPhase(stats.phase);
        }
        var phaseLabel = autoPhaseEnabled ? (tunedPhase + " (auto)") : (manualPhase + " (manual)");
        $("#thickMiuraPhaseState").html(phaseLabel);

        var boost = 0;
        if (stats && isFinite(stats.boost)) boost = Math.max(0, stats.boost);
        var boostLabel = (globals.thickAutoTuneBoost !== false && globals.thickAutoTuneEnabled !== false)
            ? ("+" + boost.toFixed(4))
            : "+0.0000";
        $("#thickMiuraBoostState").html(boostLabel);
    }

    function updateThickClearanceStats(stats, isThickMode){
        var autoState = null;
        if (globals.model && globals.model.getThickAutoTuneState){
            autoState = globals.model.getThickAutoTuneState();
        }
        updateThickAutoTuneState(autoState, isThickMode);
        if (!isThickMode || !stats || !stats.valid){
            $("#thickClearanceMin").html("--");
            $("#thickCollisionState").html("--");
            $("#thickClearancePairs").html("--");
            return;
        }
        if (stats.skipped){
            $("#thickClearanceMin").html("skipped");
            $("#thickCollisionState").html("n/a");
            $("#thickClearancePairs").html(stats.checkedPairs);
            return;
        }
        $("#thickClearanceMin").html(stats.minDistance.toFixed(6));
        $("#thickCollisionState").html(stats.collision ? "yes" : "no");
        var suffix = stats.truncated ? " (truncated)" : "";
        $("#thickClearancePairs").html(stats.checkedPairs + suffix);
    }

    setRadio("simType", globals.simType, function(val){
        var prevSimType = globals.simType;
        globals.simType = val;
        var usesDynamicSolverBefore = (prevSimType == "dynamic" || prevSimType == "thick");
        var usesDynamicSolverAfter = (globals.simType == "dynamic" || globals.simType == "thick");
        globals.simNeedsSync = !(usesDynamicSolverBefore && usesDynamicSolverAfter);
        if (globals.model) globals.model.updateMeshVisibility();
        updateThickPanelUI();
        if (globals.model){
            if (globals.simType == "thick"){
                globals.model.updateThickPanelGeometry();
            } else if (globals.model.resetThinAreaReference) {
                globals.model.resetThinAreaReference();
            }
            if (globals.model.getThinAreaStats){
                updateThinAreaStats(globals.model.getThinAreaStats(), globals.simType != "thick");
            }
            if (globals.model.getThickClearanceStats){
                updateThickClearanceStats(globals.model.getThickClearanceStats(), globals.simType == "thick");
            }
        }
    });
    updateThickPanelUI();
    updateThinAreaStats(null, globals.simType != "thick");
    updateThickClearanceStats(null, globals.simType == "thick");

    setSliderInput("#axialStiffness", globals.axialStiffness, 10, 100, 1, function(val){
        globals.axialStiffness = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#faceStiffness", globals.faceStiffness, 0, 5, 0.01, function(val){
        globals.faceStiffness = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creaseStiffness", globals.creaseStiffness, 0, 3, 0.01, function(val){
        globals.creaseStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#panelStiffness", globals.panelStiffness, 0, 3, 0.01, function(val){
        globals.panelStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#percentDamping", globals.percentDamping, 0.01, 0.5, 0.01, function(val){
        globals.percentDamping = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#panelThickness", globals.panelThickness, 0, 0.2, 0.001, function(val){
        globals.panelThickness = val;
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
    });
    setSliderInput("#minHingeGap", globals.minHingeGap, 0, 0.1, 0.001, function(val){
        globals.minHingeGap = val;
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
    });
    setSliderInput("#miuraColumnBoost", globals.miuraColumnBoost, 0, 0.2, 0.001, function(val){
        globals.miuraColumnBoost = val;
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
    });
    var miuraPhaseSlider = setSliderInput("#miuraColumnPhase", globals.miuraColumnPhase, 0, 1, 1, function(val){
        globals.miuraColumnPhase = normalizeMiuraPhase(val);
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
    });

    function refreshThickAutoTuneUI(){
        if (!globals.model || !globals.model.getThickAutoTuneState) {
            updateThickAutoTuneState(null, globals.simType == "thick");
            return;
        }
        updateThickAutoTuneState(globals.model.getThickAutoTuneState(), globals.simType == "thick");
    }

    function updateThickTuningControls(){
        var disableManualPhase = globals.thickAutoTuneEnabled !== false && globals.miuraColumnAutoPhase !== false;
        miuraPhaseSlider.slider("option", "disabled", disableManualPhase);
        $("#miuraColumnPhase>input").prop("disabled", disableManualPhase);
    }

    setCheckbox("#thickAutoTuneEnabled", globals.thickAutoTuneEnabled !== false, function(val){
        globals.thickAutoTuneEnabled = val;
        updateThickTuningControls();
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
        else refreshThickAutoTuneUI();
    });
    setCheckbox("#miuraColumnAutoPhase", globals.miuraColumnAutoPhase !== false, function(val){
        globals.miuraColumnAutoPhase = val;
        updateThickTuningControls();
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
        else refreshThickAutoTuneUI();
    });
    setCheckbox("#thickAutoTuneBoost", globals.thickAutoTuneBoost !== false, function(val){
        globals.thickAutoTuneBoost = val;
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
        else refreshThickAutoTuneUI();
    });
    updateThickTuningControls();
    refreshThickAutoTuneUI();

    function normalizePaperLinkageType(val){
        var linkageType = (val || "").toLowerCase();
        if (linkageType == "bennettpaper" || linkageType == "myard" || linkageType == "bricard") return linkageType;
        return "bennettpaper";
    }
    globals.thickLinkageType = normalizePaperLinkageType(globals.thickLinkageType);
    $("#thickLinkageType").val(globals.thickLinkageType);
    $("#thickLinkageType").on("change", function(){
        globals.thickLinkageType = normalizePaperLinkageType($(this).val());
        $(this).val(globals.thickLinkageType);
        if (globals.simType == "thick") globals.model.updateThickPanelGeometry();
    });

    var creasePercentSlider = setSliderInput("#creasePercent", globals.creasePercent*100, -100, 100, 1, function(val){
        globals.creasePercent = val/100;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent();
    });
    var creasePercentNavSlider = setSlider("#creasePercentNav>div", globals.creasePercent*100, -100, 100, 1, function(val){
        globals.creasePercent = val/100;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent();
    });
    var creasePercentBottomSlider = setSlider("#creasePercentBottom>div", globals.creasePercent*100, 0, 100, 1, function(val){
        globals.creasePercent = val/100;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent()
    });
    setInput("#currentFoldPercent", globals.creasePercent*100, function(val){
        globals.creasePercent = val/100;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent();
    }, -100, 100);

    setLink("#flatIndicator", function(){
        globals.creasePercent = 0;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent();
    });
    setLink("#foldedIndicator", function(){
        globals.creasePercent = 1;
        globals.shouldChangeCreasePercent = true;
        updateCreasePercent();
    });

    function updateCreasePercent(){
        var val = (globals.creasePercent*100);
        creasePercentSlider.slider('value', val);
        creasePercentNavSlider.slider('value', val);
        creasePercentBottomSlider.slider('value', val);
        $('#currentFoldPercent').val(val.toFixed(0));
        $('#creasePercent>input').val(val.toFixed(0));
        $("#foldPercentSimple").html(val.toFixed(0));
    }
    updateCreasePercent();

    function setDeltaT(val){
        $("#deltaT").html(val.toFixed(4));
    }

    setLink(".loadFile", function(e){
        $("#fileSelector").click();
        $(e.target).blur();
    });

    setLink(".demo", function(e){
        var $target = $(e.target);
        var url = $target.data("url");
        if (url) {
            // Check if we are loading a curved crease pattern.
            // TODO: this should be removed eventually, replace with detecting beziers in svg.
            if ($target.hasClass('cc')) {
                globals.includeCurves = true;
                globals.vertInt = 20;
                globals.apprCurve = 0.2;
            } else {
                globals.includeCurves = false;
            }
            globals.vertTol = 3;
            globals.importer.importDemoFile(url);
        }
    });

    setLink("#setupAnimation", function(){
        $("#screenCaptureModal").modal("hide");
        $("#animationSetupModal").modal("show");
    });

    setLink("#saveSVGScreenshot", function(){
        globals.threeView.saveSVG();
    });

    setLink("#saveSVG", function(){
        globals.pattern.saveSVG();
    });
    setLink("#addAnimationItem", function(){
        globals.videoAnimator.addItem();
    });
    setLink("#addDelay", function(){
        globals.videoAnimator.addDelay();
    });
    $("#animationSetupModal").on('hidden.bs.modal', function (){
        $("#screenCaptureModal").modal("show");
    });

    setCheckbox("#ambientOcclusion", globals.ambientOcclusion, function(val){
        globals.ambientOcclusion = val;
    });

    if (globals.colorMode == "color") $("#coloredMaterialOptions").show();
    else $("#coloredMaterialOptions").hide();
    if (globals.colorMode == "axialStrain") $("#axialStrainMaterialOptions").show();
    else $("#axialStrainMaterialOptions").hide();

    function setColorMode(val){
        globals.colorMode = val;
        if (val == "color") {
            $("#coloredMaterialOptions").show();
            $("#colorToggle>div").addClass("active");
            $("#strainToggle>div").removeClass("active");
        }
        else {
            $("#coloredMaterialOptions").hide();
            $("#colorToggle>div").removeClass("active");
            $("#strainToggle>div").addClass("active");
        }
        if (val == "axialStrain") $("#axialStrainMaterialOptions").show();
        else $("#axialStrainMaterialOptions").hide();
        $(".radio>input[value="+val+"]").prop("checked", true);
        globals.model.setMeshMaterial();
    }
    setRadio("colorMode", globals.colorMode, setColorMode);
    setLink("#colorToggle", function(){
        setColorMode("color");
    });
    setLink("#strainToggle", function(){
        setColorMode("axialStrain");
    });

    setHexInput("#color1", globals.color1, function(val){
        globals.color1 = val;
        globals.model.setMeshMaterial();
    });
    setHexInput("#color2", globals.color2, function(val){
        globals.color2 = val;
        globals.model.setMeshMaterial();
    });

    setCheckbox("#edgesVisible", globals.edgesVisible, function(val){
        globals.edgesVisible = val;
        if (globals.edgesVisible) $("#edgeVisOptions").show();
        else $("#edgeVisOptions").hide();
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#mtnsVisible", globals.mtnsVisible, function(val){
        globals.mtnsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#valleysVisible", globals.valleysVisible, function(val){
        globals.valleysVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#panelsVisible", globals.panelsVisible, function(val){
        globals.panelsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#passiveEdgesVisible", globals.passiveEdgesVisible, function(val){
        globals.passiveEdgesVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#boundaryEdgesVisible", globals.boundaryEdgesVisible, function(val){
        globals.boundaryEdgesVisible = val;
        globals.model.updateEdgeVisibility();
    });

    setCheckbox("#meshVisible", globals.meshVisible, function(val){
        globals.meshVisible = val;
        globals.model.updateMeshVisibility();
        if (globals.meshVisible) $("#meshMaterialOptions").show();
        else $("#meshMaterialOptions").hide();
    });

    setLink("#aboutError", function(){
        $("#aboutErrorModal").modal("show");
    });
    setLink("#aboutStiffness", function(){
        $("#aboutStiffnessModal").modal("show");
    });
    setLink("#aboutDynamicSim", function(){
        $("#aboutDynamicSimModal").modal("show");
    });
    setLink("#aboutStaticSim", function(){
        $("#aboutStaticSimModal").modal("show");
    });
    setLink("#aboutRigidSim", function(){
        $("#aboutRigidSimModal").modal("show");
    });
    setLink("#aboutAxialStrain", function(){
        $("#aboutAxialStrainModal").modal("show");
    });
    setLink("#aboutVR", function(){
        $("#aboutVRmodal").modal("show");
    });

    setCheckbox("#vrEnabled", globals.vrEnabled, function(val){
        globals.vrEnabled = val;
    });

    setLink("#start", function(){
        $("#pause").css('display', 'inline-block');
        $("#reset").css('display', 'inline-block');
        $("#start").hide();
        $("#stepForwardOptions").hide();
        globals.model.resume();
    });
    setLink("#pause", function(){
        $("#start").css('display', 'inline-block');
        $("#stepForwardOptions").css('display', 'inline-block');
        $("#pause").hide();
        globals.model.pause();
    });
    setLink("#reset", function(){
        if (!globals.simulationRunning) $("#reset").hide();
        globals.model.reset();
    });
    setLink("#resetBottom", function(){
        globals.model.reset();
    });
    setLink("#stepForward", function(){
        globals.model.step(globals.numSteps);
        $("#reset").css('display', 'inline-block');
    });

    setInput("#strainClip", globals.strainClip, function(val){
        globals.strainClip = val;
    }, 0.0001, 100);

    setCheckbox($("#userInteractionEnabled"), globals.userInteractionEnabled, enableInteraction);
    function enableInteraction(val){
        globals.userInteractionEnabled = val;
        $("#userInteractionEnabled").prop('checked', val);
        if (val) {
            $("#grabToggle>div").addClass("active");
            $("#orbitToggle>div").removeClass("active");
            globals.rotateModel = null;
            globals.threeView.resetModel();
        } else {
            $("#grabToggle>div").removeClass("active");
            $("#orbitToggle>div").addClass("active");
            globals.UI3D.hideHighlighters();
        }
    }
    setLink("#grabToggle", function(){
        enableInteraction(true);
    });
    setLink("#orbitToggle", function(){
        enableInteraction(false);
    });

    setCheckbox($("#foldUseAngles"), globals.foldUseAngles, function(val){
        globals.foldUseAngles = val;
    });

    setLink("#shouldCenterGeo", function(){
        globals.shouldCenterGeo = true;
    });

    setInput(".numStepsPerRender", globals.numSteps, function(val){
        globals.numSteps = val;
    }, 1);

    setLink("#aboutUserInteraction", function(){
        $('#aboutUserInteractionModal').modal('show');
    });

    setLink("#showAdvancedOptions", function(){
        $("#basicUI").hide();
        $("#controlsBottom").animate({
            bottom: "-140px"
        }, function(){
            $("#controls").animate({
            right: 0
            });
            $("#controlsLeft").animate({
                left: 0
            });
        });
    });
    setLink("#hideAdvancedOptions", function(){
        $("#controls").animate({
            right: "-430px"
        }, function(){
            $("#basicUI").fadeIn();
            $("#controlsBottom").animate({
                bottom: 0
            });
        });
        $("#controlsLeft").animate({
            left: "-420px"
        });
    });

    setLink("#exampleMenuButton", function(){
        $("#helper").hide();
    });


    function setButtonGroup(id, callback){
        $(id+" a").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var val = $target.data("id");
            if (val) {
                $(id+" span.dropdownLabel").html($target.html());
                callback(val);
            }
        });
    }

    function setLink(id, callback){
        $(id).click(function(e){
            e.preventDefault();
            callback(e);
        });
    }

    function setRadio(name, val, callback){
        $("input[name=" + name + "]").on('change', function() {
            var state = $("input[name="+name+"]:checked").val();
            callback(state);
        });
        $(".radio>input[value="+val+"]").prop("checked", true);
    }

    function setInput(id, val, callback, min, max){
        var $input = $(id);
        $input.change(function(){
            var $this = $(this);
            if ($input.length == 1) $this = $input;//probably not necessary
            var val = $this.val();
            if ($this.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else if ($this.hasClass("text")){
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }
            if (min !== undefined && val < min) val = min;
            if (max !== undefined && val > max) val = max;
            $input.val(val);
            callback(val);
        });
        $input.val(val);
    }

    function setHexInput(id, val, callback){
        var $input = $(id);
        $input.css({"border-color": "#" + val});
        $input.change(function(){
            var val = $input.val();
            var validHex  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(val);
            if (!validHex) return;
            $input.val(val);
            $input.css({"border-color": "#" + val});
            callback(val);
        });
        $input.val(val);
    }

    function setCheckbox(id, state, callback){
        var $input  = $(id);
        $input.on('change', function () {
            if ($input.is(":checked")) callback(true);
            else callback(false);
        });
        $input.prop('checked', state);
    }

    function setSlider(id, val, min, max, incr, callback, callbackOnStop){
        var slider = $(id).slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });
        slider.on("slide", function(e, ui){
            var val = ui.value;
            callback(val);
        });
        slider.on("slidestop", function(){
            var val = slider.slider('value');
            if (callbackOnStop) callbackOnStop(val);
        });
        return slider;
    }

    function setLogSliderInput(id, val, min, max, incr, callback){

        var scale = (Math.log(max)-Math.log(min)) / (max-min);

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: (Math.log(val)-Math.log(min)) / scale + min,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', (Math.log(val)-Math.log(min)) / scale + min);
            callback(val, id);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            val = Math.exp(Math.log(min) + scale*(val-min));
            $input.val(val.toFixed(4));
            callback(val, id);
        });
    }

    function setSliderInputVal(id, val){
        $(id+">div").slider({value:val});
        var $input = $(id+">input");
        $input.val(val);
    }

    function setSliderInput(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
        return slider;
    }

    return {
        setDeltaT: setDeltaT,
        updateCreasePercent: updateCreasePercent,
        setSliderInputVal: setSliderInputVal,
        updateThinAreaStats: updateThinAreaStats,
        updateThickClearanceStats: updateThickClearanceStats
    }
}

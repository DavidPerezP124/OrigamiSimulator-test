# OrigamiSimulator

Live demo at <a href="https://origamisimulator.org/">origamisimulator.org</a><br/>

<img style="width: 100%; max-width:500px" src="assets/doc/crane.gif" />

This app allows you to simulate how any origami crease pattern will fold.  It may look a little different
from what you typically think of as "origami" - rather than folding paper in a set of sequential steps,
this simulation attempts to fold every crease simultaneously. It does this by iteratively solving for small displacements in the geometry of an initially flat sheet due to forces
exerted by creases.
You can read more about it in our paper:
<ul>
<li><a target="_blank" href="http://erikdemaine.org/papers/OrigamiSimulator_Origami7/">Fast, Interactive Origami Simulation using GPU Computation</a> by Amanda Ghassaei, Erik Demaine, and Neil Gershenfeld (7OSME)
</ul>

**If you have feedback about features you want to see in this app, please see [this thread](https://github.com/amandaghassaei/OrigamiSimulator/discussions/41).**

All simulation methods were written from scratch and are executed in parallel in several GPU fragment shaders for fast performance.
The solver extends work from the following sources:
<ul>
<li><a target="_blank" href="http://www3.eng.cam.ac.uk/~sdg/preprint/5OSME.pdf">Origami Folding: A Structural Engineering Approach</a> by Mark Schenk and Simon D. Guest<br/>
<li><a target="_blank" href="http://www.tsg.ne.jp/TT/cg/TachiFreeformOrigami2010.pdf">Freeform Variations of Origami</a> by Tomohiro Tachi<br/>
</ul>
<p>
This app also uses the methods described in <a href="http://www.cgg.cs.tsukuba.ac.jp/projects/2020/RulingAwareTriangulation/index.html" target="_blank">Simple Simulation of Curved Folds Based on Ruling-aware Triangulation</a> to import curved crease patterns and pre-process them in a way that realistically simulates the bending between the creases.
</p>

<p>
Originally built by <a href="http://www.amandaghassaei.com/" target="_blank">Amanda Ghassaei</a> as a final project for <a href="http://courses.csail.mit.edu/6.849/spring17/" target="_blank">Geometric Folding Algorithms</a>.
Other contributors include <a href="http://www.cgg.cs.tsukuba.ac.jp/~sasaki_k/" target="_blank">Sasaki Kosuke</a>, <a href="http://erikdemaine.org/" target="_blank">Erik Demaine</a>, and <a href="https://github.com/amandaghassaei/OrigamiSimulator/graphs/contributors" target="_blank">others</a>.
Code available on <a href="https://github.com/amandaghassaei/OrigamiSimulator" target="_blank">Github</a>.  If you have interesting crease patterns that would
make good demo files, please send them to me (Amanda) so I can add them to the <b>Examples</b> menu.  My email address is on my website.  Thanks!<br/>
</p><br/>
<b>Instructions:</b><br/><br/>
<img style="width: 100%; max-width:600px" src="assets/doc/demoui.gif" /><br/>

<ul>
    <li>Slide the <b>Fold Percent</b> slider to control the degree of folding of the pattern (100% is fully folded, 0% is unfolded,
        and -100% is fully folded with the opposite mountain/valley assignments).</li>
    <li>Drag to rotate the model, scroll to zoom.</li>
    <li>Import other patterns under the <b>Examples</b> menu.</li>
    <li>Upload your own crease patterns in SVG or <a href="https://github.com/edemaine/fold" target="_blank">FOLD</a> formats, following <a href="#" class="goToImportInstructions">these instructions</a>.</li>
    <li>Export FOLD files or 3D models ( STL or OBJ ) of the folded state of your design ( <b>File > Save Simulation as...</b> ).</li>
</ul>
    <img style="width: 100%;" src="assets/doc/strain.jpg" />
<ul>
    <li>Visualize the internal strain of the origami as it folds using the <b>Strain Visualization</b> in the left menu of the <b>Advanced Options</b>.</li>
</ul>
    <img style="width: 100%; max-width:600px" src="assets/doc/huffmanvr.jpg" /><br/>
<ul>
    <li>If you are working from a computer connected to a VR headset and hand controllers, follow <a href="#" id="goToViveInstructions">these instructions</a>
        to use this app in an interactive virtual reality mode. (sorry I think this may be deprecated now!)</li>
</ul>

<br/>
<b>Material Thickness Simulation:</b><br/><br/>
<p>
Enable <b>Simulate material thickness</b> in the <b>Simulation Settings</b> of the <b>Advanced Options</b> to fold as a stack of rigid plates
of a given thickness instead of a zero-thickness sheet.  The folded surface is rendered as an extruded solid, and each crease's fold angle is
limited so plates cannot pass through each other - a flat foldable pattern folds into a wedged stack of plates ("thick flat foldable")
rather than collapsing onto a single plane.
</p>
<p>
The fold angle limits are derived from two known thickness-accommodation techniques.  For patterns with a flat-folded state
(all fold angles 0&deg; or &plusmn;180&deg;), a layer ordering of the folded state is estimated from the mountain/valley assignment
(the reflection-map/layer-ordering formulation of Demaine &amp; O'Rourke, <i>Geometric Folding Algorithms</i>; the exact ordering problem
is NP-hard per Akitaya et al., so a longest-path layering heuristic over the crease constraint graph is used).  Each hinge then gets the
number of material layers it must wrap around in the folded stack, and its maximum fold angle follows the tapered-panel/axis-shift
accommodation of Tomohiro Tachi's <a href="https://origami.c.u-tokyo.ac.jp/~tachi/cg/ThickRigidOrigamiASME2011.pdf" target="_blank">
Rigid-Foldable Thick Origami</a>: a hinge spanning a gap <i>g</i> with panel depth <i>h</i> can close at most to
&pi;&nbsp;&minus;&nbsp;2&nbsp;atan(<i>g</i>/2<i>h</i>).  Like everything else in this compliant simulation the limits are applied as soft
constraints, so tightly wrapped multi-layer folds may still locally exceed their limit under load from neighboring creases.
</p>
<p>
A penalty-based collision solver backs up the fold angle limits (enabled by default when thickness simulation is on).
Every simulation substep, an additional GPU pass tests each vertex against every plate of the mesh and applies a repulsion
force along the plate normal wherever the material would overlap, with the equal and opposite reaction distributed over the
contacted triangle's vertices by barycentric weight; hinges pushed past their thickness limit stiffen one-sidedly
(hinge-line contact).  This is standard penalty-force contact as used in cloth simulation (all-pairs
vertex&ndash;triangle tests).  Because it is all-pairs its cost is a product of the model's size - the direct pass is
O(vertices&nbsp;&times;&nbsp;faces) and the reaction gather O(vertices&sup2;&nbsp;&times;&nbsp;valence) per substep, with 100
substeps per rendered frame - so it is enabled only for models whose total stays inside a fixed budget (roughly a few
hundred vertices).  Larger models keep their thickness fold angle limits and report in the console that contact was
skipped; a spatial acceleration structure would be needed to lift that ceiling.
</p>
<p>
Known limitations of the contact pass:
</p>
<ul>
<li>It resolves vertex&ndash;triangle contacts only.  Two plates that cross edge-to-edge with no vertex of either projecting
inside the other (an "X" intersection of two long thin triangles) are not detected; full coverage needs edge&ndash;edge
tests as well.  In practice origami layer stacking is dominated by vertex&ndash;face contact, and the fold angle limits
prevent the configurations where X-crossings typically arise.</li>
<li>Being a penalty method, deep overlaps under extreme load relax only approximately, and the anti-tunneling test uses one
substep of velocity history, so a slow sustained squeeze-through is not strictly impossible.</li>
</ul>
<p>
In the thick view each triangle is drawn as an independent square-edged slab extruded about the folded midsurface, so plates
keep their full thickness at every fold angle.  Plates are not trimmed against each other at hinges, so two slabs hinged
about their shared midsurface edge still overlap in a thin wedge along the crease line, growing as the fold tightens.
Removing it properly requires convex-clipping every slab against its neighbours' dihedral bisector planes (variable output
topology), or moving the hinge axis off the midsurface as in Tachi's tapered-panel / axis-shift constructions; simply
displacing the six slab vertices toward the bisector is not equivalent and measurably introduces new interpenetrations
where two trimmed edges share a corner.  The wedge is a display artifact only - it does not affect the simulated fold
angles, which are limited independently as described above.
</p>

<br/>
<b>External Libraries:</b><br/><br/>
<ul>
    <li>All rendering and 3D interaction done with <a target="_blank" href="https://threejs.org/">three.js</a></li>
    <li><a href="https://github.com/fontello/svgpath" target="_blank">svgpath</a> and <a href="https://www.npmjs.com/package/path-data-polyfill" target="_blank">path-data-polyfill</a> helps with SVG path parsing</li>
    <li><a href="https://github.com/edemaine/fold" target="_blank">FOLD</a> is used as the internal data structure, methods from the
        <a href="https://github.com/edemaine/fold/blob/master/doc/api.md" target="_blank">FOLD API</a> used for SVG parsing</li>
    <li>Arbitrary polygonal faces of imported geometry are triangulated using the <a target="_blank" href="https://github.com/mapbox/earcut">Earcut Library</a> and <a href="https://github.com/mikolalysenko/cdt2d" target="_blank"></a>cdt2d</a></li>
    <li><a href="http://www.numericjs.com/" target="_blank">numeric.js</a> for linear algebra operations</li>
    <li>GIF and WebM video export uses <a target="_blank" href="https://github.com/spite/ccapture.js/">CCapture</a></li>
</ul>
<p>
<br/>
You can find additional information in <a href="http://erikdemaine.org/papers/OrigamiSimulator_Origami7/" target="_blank">our 7OSME paper</a> and <a href="http://www.amandaghassaei.com/projects/origami_simulator/" target="_blank">project website</a>.
If you have feedback about features you want to see in this app, please see <a href="https://github.com/amandaghassaei/OrigamiSimulator/discussions/41" target="_blank">this thread</a>.
<br/>
</p>

# Procedural 3D quality: making primitive-built three.js / R3F archviz look production-grade

Context checked in repo (2026-10-02): `three@^0.186.1`, `@react-three/fiber@^9.8.1`, `@react-three/drei@^10.7.9`, no `@react-three/postprocessing` / `postprocessing` / `n8ao` installed. `IsoCanvas.tsx` and `WalkthroughScene.tsx` both use `shadows="soft"` + `ACESFilmicToneMapping`; walkthrough camera is `fov: 72` (vertical), `EYE_H` eye height. These facts matter for several findings below.

## Lighting: env lighting without HDRI, sun/sky, shadow settings, soft shadows, baked AO

### Takeaway
Image-based light is what removes the "flat beige box" look, and it can be produced with zero files: three.js `RoomEnvironment` via `PMREMGenerator.fromScene`, or drei `<Environment>` with `<Lightformer>` children (drei presets must NOT be used: they fetch from a CDN). Combine one shadow-casting directional "sun" (PCF + `shadow.radius`, tight frustum) with soft contact/ground shadows (ContactShadows or AccumulativeShadows, rendered once for static scenes); for interiors where shadow maps are not enough, an in-browser progressive lightmap bake is the only file-free route to real GI/AO.

### Cited Findings
- `RoomEnvironment` is a built-in procedural room scene; `new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), sigma, near, far).texture` gives an env map with no HDR file, assignable to `scene.environment` (and optionally `scene.background`). Optional `sigma` blurs it — [three.js PMREMGenerator docs](https://threejs.org/docs/#api/en/extras/PMREMGenerator)
- drei `<Environment>` can render arbitrary children into a cube map, so a custom "studio" built from `<Lightformer form="rect" intensity={2} scale={8} position={[0,5,0]} />` needs no HDRI; `resolution={256}` keeps cost low; `frames={Infinity}` only if it must animate (default renders once) — [drei Environment docs](https://drei.docs.pmnd.rs/staging/environment)
- drei explicitly warns the `preset` prop "is not meant to be used in production environments and may fail as it relies on CDNs"; self-hosting via `@pmndrs/assets` is suggested (that is an external HDR file, so it is ruled out by this project's no-asset rule) — [drei Environment docs](https://drei.docs.pmnd.rs/staging/environment)
- Physically-correct lighting is now the only mode: `useLegacyLights` was deprecated in r155 and removed in r165; intensities are no longer scaled by PI, point/spot lights decay physically (default `decay=2`); to port old values multiply ambient/hemisphere/directional intensities by PI — [three.js r165 release](https://github.com/mrdoob/three.js/releases/tag/r165), [forum: Updates to lighting in r155](https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733), [PR #23897 decay=2](https://github.com/mrdoob/three.js/pull/23897)
- Shadow-map type change: from r182 `PCFSoftShadowMap` is deprecated with WebGLRenderer; `PCFShadowMap` is now soft and softness is controlled by `light.shadow.radius` (or use `VSMShadowMap`) — [Migration discussion / three.js issue #32591](https://github.com/mrdoob/three.js/issues/32591), [R3F issue #3749 "PCFSoftShadowMap is deprecated"](https://github.com/pmndrs/react-three-fiber/issues/3749)
- In R3F v9, `shadows="soft"` and `shadows="percentage"` both map to `THREE.PCFShadowMap`; `"soft"` is kept only as a deprecated alias and logs a deprecation notice; use `shadows` / `shadows="percentage"` (or `"variance"` for VSM) — [R3F PR #3984](https://github.com/pmndrs/react-three-fiber/pull/3984), [R3F issue #3801](https://github.com/pmndrs/react-three-fiber/issues/3801), [R3F Canvas docs](https://r3f.docs.pmnd.rs/api/canvas)
- A user report states shadows became "extremely pixelated" with `PCFSoftShadowMap` in r0.182.0 (regression from r0.181) — [three.js issue #32591](https://github.com/mrdoob/three.js/issues/32591); another project reports "PCFSoftShadowMap no longer exists in three r186 — a warning every session and hard shadows" — [ch-bas/threejs-sims-house-builder #379](https://github.com/ch-bas/threejs-sims-house-builder/issues/379) (third-party issue, not an official statement, but consistent with the deprecation)
- VSM gives very soft shadows but can light-bleed without tuning — [threejs shadows tutorial (mysimulator)](https://www.mysimulator.uk/content/tutorials/threejs-shadows.html) (secondary source). Note: one secondary source claims PCFSoftShadowMap "uses the PCSS algorithm" — that is incorrect; PCSS in three/R3F comes from drei `<SoftShadows>` (shader-chunk patch) — [drei softShadows.tsx source](https://github.com/pmndrs/drei/blob/master/src/core/softShadows.tsx), [forum: realistic PCSS implementation](https://discourse.threejs.org/t/new-realistic-pcss-soft-shadow-implementation-react-vanilla/48579)
- drei `<ContactShadows>` defaults: `opacity 1`, `scale 10`, `blur 1`, `far 10`, `resolution 256`, `color #000000`, `frames Infinity`; "rather expensive", so use `frames={1}` for static objects — [drei ContactShadows doc source](https://raw.githubusercontent.com/pmndrs/drei/master/docs/staging/contact-shadows.mdx)
- drei `<AccumulativeShadows>` + `<RandomizedLight>`: accumulates jittered shadow-map renders over `frames` (default 40) into soft raytrace-like shadows + AO on a ground plane, "zero performance impact after all frames have accumulated"; `temporal` spreads accumulation over frames; `alphaTest` default 0.65; limitation: ground-plane only — [drei AccumulativeShadows docs](https://drei.docs.pmnd.rs/staging/accumulative-shadows)
- three.js `webgl_shadowmap_progressive` (ProgressiveLightMap) bakes soft shadows / GI in the browser over many frames into a lightmap; needs a second UV set (`uv2`/`uv1`) and params `lightMapRes`, `blendWindow`, `lightRadius`, `ambientWeight`; inspired by evanw's lightmap generation — [three.js example](https://threejs.org/examples/webgl_shadowmap_progressive.html)
- Baked AO without files: per-vertex AO (e.g. geo-ambient-occlusion) can be written into a vertex attribute and read by a custom shader, or mapped through a 1×256 gradient as `aoMap`; `aoMap` reads the red channel and needs a second UV set — [three.js forum: bake AO into vertex color](https://discourse.threejs.org/t/how-would-i-begin-to-bake-lighting-ao-into-vertex-color-data/48689), [forum: AO vs lightmaps](https://discourse.threejs.org/t/ambient-oclusion-vs-lightmaps/31333)
- drei also ships `<BakeShadows>` (freezes shadow maps after first render for static scenes) — [r3f-lighting skill summary](https://lobehub.com/skills/enzed-r3f-skills-r3f-lighting) (secondary)

### Inferences
- Current repo uses `shadows="soft"` on three r186 → it now resolves to `PCFShadowMap` with a deprecation notice; softness depends on `shadow.radius` and `shadow.mapSize`, so without setting those the shadows will look hard/aliased — a likely contributor to the "cheap" look. Switch to `shadows` (PCF) + explicit `radius` (~4–8), `mapSize` 2048 desktop / 1024 mobile, tight `shadow.camera` bounds around the house, `normalBias` ~0.02–0.05 for box geometry (tune).
- Interior walkthrough recipe (no files): `scene.environment` = PMREM of `RoomEnvironment` (or a Lightformer rig shaped like the actual windows: big rect lightformers on the window side, dim warm one opposite) at `environmentIntensity` ~0.5–1; one directional sun through window openings casting soft PCF shadows; a low-intensity `HemisphereLight` (sky tint / warm ground bounce) to fake bounce; NO bright point light near the ceiling (that is what produces the ceiling hotspot). Light should come from windows, i.e. from the side, so walls get a gradient.
- Isometric dollhouse + village: one sun at ~35–50° elevation, PCF shadows, plus `ContactShadows frames={1}` or `AccumulativeShadows` under the house to ground it; for the village overview AccumulativeShadows (static, ground-plane) is ideal since all houses sit on one plane.
- Progressive lightmap bake is the "big lever" for interiors but requires generating UV2 for procedural boxes (BoxGeometry has UVs per face; a lightmap atlas UV needs unique non-overlapping UVs — extra engineering). Treat as stage-2 option.

### Gaps
- No primary three.js doc page for `shadow.radius` behaviour after r182 was fetched; the PCF-is-now-soft statement comes from the GitHub issue/R3F threads, not the official migration guide text.
- Could not fetch drei `<SoftShadows>` docs (404); defaults for `size/focus/samples` not verified here. Also not verified whether SoftShadows still works with r186 shader chunks.
- No measured perf numbers for RoomEnvironment vs Lightformer env on mobile.

## Tone mapping & color management

### Takeaway
For architecture where the client's palette must render true-to-swatch, use `NeutralToneMapping` (Khronos PBR Neutral) — ACES (currently used in the repo) shifts hues (oranges → yellow, saturates), which is a plausible cause of the "flat orange floor". AgX is the alternative if a softer, filmic, lower-contrast look is wanted. Keep linear working space and sRGB output (R3F defaults).

### Cited Findings
- three.js exposes `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping`, `CineonToneMapping`, `ReinhardToneMapping`, `LinearToneMapping`, `NoToneMapping`, `CustomToneMapping` — [three.js constants docs](https://threejs.org/docs/#api/en/constants/Renderer)
- Khronos PBR Neutral = `THREE.NeutralToneMapping`; designed to "faithfully reproduce" base color, hue and saturation under grayscale lighting while removing HDR highlight artifacts; aimed at eCommerce, architecture, CAD; ~13 lines of GLSL — [Khronos press release](https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products), [three.js forum tone mapping overview](https://discourse.threejs.org/t/tone-mapping-overview/75204/7), [model-viewer PBR Neutral example](https://modelviewer.dev/examples/tone-mapping)
- ACES "changes your colors, not just the intensities", with hue skew toward primaries (oranges → yellow, cyans dominate); AgX is more neutral but intentionally lower contrast ("a good foundation for color grading", "a bit flat"); Neutral is recommended for product/architecture where the customer palette must look the same after rendering — [three.js forum: Tone Mapping Overview](https://discourse.threejs.org/t/tone-mapping-overview/75204)
- Color-management rules: lighting math in Linear-sRGB; color textures tagged sRGB, data textures linear; hex/CSS colors are sRGB and must be converted to linear (automatic when ColorManagement is enabled, which R3F does by default) — [Don McCurdy, Color management in three.js](https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/) (note: article predates r152 API rename `encoding` → `colorSpace` / `outputColorSpace = SRGBColorSpace`)

### Inferences
- Because design tokens (DESIGN-SPEC hex values) are authored in sRGB and R3F converts them to linear, a token hex on a lit surface will NOT appear as that hex on screen with ACES; with Neutral it will be close under neutral-white light at exposure ~1. Recommend `gl={{ toneMapping: NeutralToneMapping, toneMappingExposure: ~1.0 }}` and validate by sampling pixels on a sunlit wall vs token.
- Muddy look usually = low exposure + dark-grey ambient fill; oversaturated look = saturated base colors + ACES. Rule: keep base colors desaturated (architectural finishes are rarely >40% saturation), let light color (warm sun / cool sky) carry mood.
- If postprocessing is added, tone mapping must move to the end of the effect chain (ToneMapping effect) and renderer tone mapping set to `NoToneMapping` — standard pmndrs pattern (not re-verified here).

### Gaps
- Don McCurdy's dedicated PBR Neutral post URL returned 404; no exposure number recommendation from a primary source was found.

## Post-processing: AO, AA, bloom, DoF on web/mobile

### Takeaway
Screen-space AO (N8AO) is the single post effect with the biggest "not a toy" payoff for box geometry (corner/contact darkening), and MSAA via the composer handles AA; bloom and DoF should be off or extremely restrained for archviz. All of this needs new dependencies (`@react-three/postprocessing` + `postprocessing`, optionally `n8ao`) — requires team approval per CLAUDE.md rule 7.

### Cited Findings
- N8AO: SSAO for three.js; `aoRadius` in world units, ~1–2 orders of magnitude smaller than scene scale (rule of thumb 1/100–1/10 of scene's largest dimension); `distanceFalloff` (default 1.0) reduces haloing; `intensity` applied as `pow(ao, intensity)` (2 = soft, 5 = prominent); `color` tint for faux bounce; quality presets from "Performance" (8 samples, mobile-friendly) to "Ultra" (64 samples), plus denoised variants; `halfRes` gives 2–4× speedup with depth-aware upscale; works as `N8AOPass` (three EffectComposer) or `N8AOPostPass` (pmndrs postprocessing); gamma correction on by default — disable if done elsewhere — [N8AO GitHub](https://github.com/N8python/n8ao)
- react-postprocessing: install `@react-three/postprocessing`; `EffectComposer` merges effects into a single EffectPass (fullscreen triangle) to avoid chained-pass cost; WebGL2 MSAA by default for crisp edges; provides N8AO, SSAO, SMAA, Bloom (`mipmapBlur`, `luminanceThreshold`), ToneMapping, DepthOfField, Noise, Vignette — [react-postprocessing docs](https://react-postprocessing.docs.pmnd.rs/introduction)

### Inferences
- Priority order for this project: (1) N8AO "Performance"/`halfRes` on mobile, "Medium" on desktop, `aoRadius` ~0.3–0.6 m for a 1:1-meter house, intensity 2–3, slightly warm AO color; (2) MSAA (composer multisampling 4 desktop, 0–2 mobile) or SMAA on mobile; (3) Bloom: only if windows/emissive must glow, `luminanceThreshold` ≥ 1 so only HDR values bloom, low intensity; (4) DoF: skip for walkthrough (archviz photos are deep-focus); maybe a tilt-shift-like DoF for the village "maquette" overview only.
- No-dependency alternative: baked/vertex AO + ContactShadows + AccumulativeShadows give most of the grounding without a composer, and fit `frameloop="demand"` better (post effects re-render whole frame each invalidate).

### Gaps
- No primary benchmark numbers (ms per frame) found for N8AO on mid-range phones.
- Did not verify whether `n8ao` is bundled inside `@react-three/postprocessing` or a separate peer dependency in current versions.

## Materials without textures & art direction (maquette/clay vs photoreal)

### Takeaway
With primitive geometry, a coherent "architectural model / clay render" art direction (warm off-white matte massing, one or two accent materials, soft AO and shadows) reads as deliberate and premium, whereas flat saturated colors on boxes (green sofa, orange floor) read as toy-like. Photoreal fails without textures and detailed meshes; the honest maquette look succeeds because it's an established professional genre.

### Cited Findings
- Clay renders "show architecture without noise—no materials, no colors, just clean geometry bathed in soft shadows", focusing attention on volume, proportion and structure — [ArchiVinci: What is clay rendering](https://www.archivinci.com/blogs/what-is-clay-rendering), [archvisualizations.com: clay rendering](https://archvisualizations.com/what-is-a-clay-rendering-and-why-you-need-it/)
- The clay look relies on matte, soft Lambertian surfaces with subtle ambient occlusion defining edges and contact points — [ArchiVinci](https://www.archivinci.com/blogs/what-is-clay-rendering), [Visualizing Architecture: Kerkythea clay rendering](https://visualizingarchitecture.com/sketchup-to-kerkythea-clay-rendering/)
- Soft/conceptual rendering styles (sketch, clay, watercolor) are an accepted presentation genre distinct from photoreal — [CADScene: soft architectural rendering](https://cadscene.com/soft-and-conceptual-rendering-styles), [7CGI: archviz styles](https://7cgi.com/blog/architectural-visualization-styles/)
- pmndrs reference examples of stylized/architectural scenes built mostly from simple geometry: "csg-house", "sport-hall", "room-with-soft-shadows", "baking-soft-shadows" — [R3F examples](https://r3f.docs.pmnd.rs/getting-started/examples)

### Inferences (art-direction rules for the team; derived, not from a single source)
- Pick ONE register per view: (a) dollhouse iso + village = "maquette": off-white/greige massing, roofs a half-step darker, landscape as muted sage felt, plots tinted only for status; (b) walkthrough = "clay-plus": same neutral shell + 2–3 material accents (timber floor tone, one fabric tone) with low saturation, not full photoreal.
- Roughness 0.7–0.9 for walls/plaster/fabric, 0.4–0.6 for timber floor (catches a soft env reflection, which kills the "flat orange" look), metalness 0 everywhere except fixtures (0.8–1, roughness 0.3).
- Bevel every visible box edge: drei `<RoundedBox radius≈0.01–0.02 smoothness 2–4>` so edges catch light — sharp 90° edges with flat shading are the #1 toy tell. Use sparingly (vertex cost) and instanced where repeated.
- Furniture: build from multiple primitives with real proportions (sofa = base + seat cushions with gaps + back cushions + arms, seat height ~0.42 m, depth ~0.9 m) rather than one colored box; add a slight gap (5–10 mm) between parts so AO/contact shadow appears.
- Subtle procedural variation without textures: very low-amplitude value-noise in color via `onBeforeCompile` / vertex color jitter (±2–3% lightness) on floors and walls; avoid visible patterns.
- Edge lines (drei `<Edges>` thin, low-contrast) suit the maquette iso/village view, not the interior walkthrough.
- All material colors must map to DESIGN-SPEC tokens (project rule 2); likely needs a small set of "material tokens" added to the spec — ask before inventing.

### Gaps
- Sources on clay rendering are mostly marketing-style blogs from render studios; no academic/primary source on perceived quality of clay vs photoreal for real-estate buyers.
- No verified Thai real-estate market evidence on whether buyers accept maquette-style interiors.

## Interior camera: focal length / FOV, eye height, verticals, composition

### Takeaway
Architectural interior photography uses 24–35 mm full-frame equivalent at ~1.5–1.6 m eye height with a perfectly level camera (two-point perspective). The repo's walkthrough uses three.js vertical `fov: 72`, which equals ~16.5 mm full-frame vertically (~105° horizontal on a 16:9 screen) — far wider than professional norms and the direct cause of the "huge dark ceiling" frame.

### Cited Findings
- Interiors: "24–35 mm (full-frame equivalent) is the honest range"; exteriors 35–70 mm, 85 mm+ to compress façades; an over-wide lens "stretches everything at the edges, exaggerates depth, and makes spaces feel cavernous and unreal" — [3DStuff: Architectural camera setup](https://3dstuff.at/articles/architectural-camera-setup.html)
- Eye height "roughly 1.5–1.6 m" standing, "~1.1–1.2 m" for a seated/lounge feel — [3DStuff](https://3dstuff.at/articles/architectural-camera-setup.html); Architizer suggests ~6 ft (~1.8 m) for eye-level exterior perspectives — [Architizer: 7 rules for perspectives](https://architizer.com/blog/practice/tools/the-art-of-rendering-perspectives/) (slight conflict; 1.5–1.6 m is the interior norm)
- Keep the camera perfectly level so verticals stay vertical; frame higher/lower with vertical shift / tilt-shift (2-point perspective) instead of tilting; tilting causes keystoning — [3DStuff](https://3dstuff.at/articles/architectural-camera-setup.html), [Picfair: correcting perspective](https://focus.picfair.com/articles/correcting-the-perspective-in-architecture-photography)
- Pointing the camera toward a room corner gives two vanishing points and makes small rooms feel larger — [Architizer](https://architizer.com/blog/practice/tools/the-art-of-rendering-perspectives/)
- Composition: foreground element for depth, leading lines (floor, ceiling, joinery), rule of thirds, one clear subject per shot — [3DStuff](https://3dstuff.at/articles/architectural-camera-setup.html)

### Inferences
- three.js `PerspectiveCamera.fov` is vertical. Full-frame 36×24 mm conversion: vfov = 2·atan(12/f). 24 mm → 53.1°, 28 mm → 46.4°, 35 mm → 37.8°; fov 72° → f ≈ 16.5 mm. On a 16:9 viewport, a 24 mm horizontal angle (73.7°) corresponds to vfov ≈ 46°. Recommend vfov 45–50° on landscape desktop, and on portrait mobile compute vfov from a fixed horizontal FOV (~70–75°) so the phone doesn't show floor-to-ceiling slivers. (three.js also has `camera.setFocalLength(mm)` with `filmGauge` default 35 applied to the larger axis — API recalled, not re-fetched.)
- Keep pitch = 0 for stills; if more floor/less ceiling is needed, use lens shift via `camera.setViewOffset(...)` (shifts the frustum without tilting, preserving verticals). For a 2.6–2.8 m ceiling at 1.5 m eye height, a level camera already shows more floor than ceiling only if shifted down slightly; a small downward shift (~5–10% of frame height) is a typical archviz move.
- Ceiling: give it the same light-neutral as walls (not darker), and ensure light reaches it (env light / hemisphere sky term) — a dark ceiling occupying ~40% of frame is the main thing the client saw.
- For walkthrough stills: compose toward a corner with the window in frame (side light, natural gradient), foreground furniture edge at frame bottom, horizon at ~1/3–1/2 height.

### Gaps
- No primary source found specifically on ceiling-to-floor frame ratio rules.
- No source for mobile-portrait FOV conventions in web walkthroughs.

## Mobile performance

### Takeaway
Render-on-demand, capped DPR, instancing, adaptive quality (PerformanceMonitor / regress), and one-shot shadows (ContactShadows `frames={1}`, AccumulativeShadows, BakeShadows) keep high-quality static archviz cheap on phones; post AO should go half-res/"Performance" preset on mobile.

### Cited Findings
- `<Canvas frameloop="demand">` renders only when needed; call `invalidate()` when mutating outside React (e.g. controls); keep draw calls ideally "a few hundred or less" (never >1000); use `InstancedMesh`; drei `<Detailed distances={[0,10,20]}>` for LOD; drei `PerformanceMonitor` with `onIncline/onDecline`; `regress()` on interaction + DPR × `performance.current` (0.1–1) for movement regression — [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- ContactShadows "rather expensive" → `frames={1}` for static — [drei ContactShadows](https://raw.githubusercontent.com/pmndrs/drei/master/docs/staging/contact-shadows.mdx); AccumulativeShadows has no cost after accumulation — [drei docs](https://drei.docs.pmnd.rs/staging/accumulative-shadows)
- N8AO `halfRes` 2–4× faster; "Performance" preset 8 samples for mobile — [N8AO](https://github.com/N8python/n8ao)
- Instanced vertex colors example for many identical primitives with per-instance color — [pmndrs instanced-vertex-colors](https://pmndrs.github.io/examples/instanced-vertex-colors/)

### Inferences
- Concrete budget suggestion: `dpr={[1, 1.5]}` mobile / `[1, 2]` desktop; shadow `mapSize` 1024 mobile / 2048 desktop with tight frustum; Environment `resolution` 128–256; village houses/trees via `InstancedMesh` (or drei `<Instances>`); env map generated once.
- Progressive "quality on idle": render cheap while orbiting (regress), then after camera stops let AccumulativeShadows/progressive lightmap accumulate — this is the pattern that makes static web archviz look offline-rendered.
- The repo's `scripts/render-stills.mjs` produces PNG stills; for stills the desktop budget can be maxed (higher DPR, more AO samples, more accumulation frames) since they are rendered offline.

### Gaps
- No primary-source per-device numbers for shadow map sizes on mid-range Android.

## Reference examples of polished procedural/stylized web 3D

### Takeaway
The pmndrs example gallery is the best concrete reference set for soft-shadowed, primitive-heavy scenes; the room and baking examples show exactly the shadow/env stack recommended above.

### Cited Findings
- pmndrs examples: room-with-soft-shadows (https://pmndrs.github.io/examples/room-with-soft-shadows/), soft-shadows (https://pmndrs.github.io/examples/soft-shadows/), baking-soft-shadows (https://pmndrs.github.io/examples/baking-soft-shadows/), building-dynamic-envmaps / building-live-envmaps (Lightformer env), csg-house (https://pmndrs.github.io/examples/csg-house/), sport-hall (https://pmndrs.github.io/examples/sport-hall/), instanced-vertex-colors — [R3F examples index](https://r3f.docs.pmnd.rs/getting-started/examples)
- three.js progressive lightmap example (in-browser GI bake) — [threejs.org/examples/webgl_shadowmap_progressive](https://threejs.org/examples/webgl_shadowmap_progressive.html); original technique by evanw — [madebyevan.com/shaders/lightmap](https://madebyevan.com/shaders/lightmap/)
- PCSS soft shadows (react + vanilla) community implementation — [three.js forum](https://discourse.threejs.org/t/new-realistic-pcss-soft-shadow-implementation-react-vanilla/48579)

### Inferences
- Bruno Simon's portfolio (bruno-simon.com) and Three.js Journey's baked-scene lessons are well-known references for the "stylized + baked lighting" look, but those rely on Blender-baked textures (external assets), so they are aesthetic references only — not reproducible under this project's procedural-only rule.

### Gaps
- Did not fetch/verify individual example source code (which drei components each uses) or studio portfolio examples; no 2026-specific showcase list found. Three.js Journey articles were not accessed (paywalled course content).

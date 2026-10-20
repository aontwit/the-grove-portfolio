# The Grove codebase: gap inventory against production-grade quality

Scope: read-only audit of `C:\jobs\the-grove` on 2026-10-02 (branch `main`, HEAD `efe60d5`, with a large uncommitted working tree: about 45 modified files, new error/not-found pages, `MasterPlan3D.tsx`, `NavLinks.tsx`, `PlotList.tsx`, `TravelTimes.tsx`, and deleted renders `baibua-iso-h12.png` and `baibua-walk-h17.png`). Every citation is a repo file path with line numbers. A dev server was running on :3000, and some probes are cited as "live probe".

## Q1. Constraints any recommendation must respect

### Takeaway
DESIGN-SPEC.md is immutable and very strict. It fixes the palette and fonts, two radii, no shadows, gradients or glow on UI, motion limited to one autonomous moment, and exact 3D light and material values. Dependencies are locked. Copy must be in the owner's voice with real numbers and no fabricated proof. Any "make it look less mock" plan has to work inside these rules or explicitly ask the owner to change them.

### Cited Findings
- Rules in CLAUDE.md: Thai-only replies. Every color, font, radius and spacing must come from DESIGN-SPEC §1-3 tokens ("a stray hex is a bug"). Geometry comes only from `src/geometry/`, and 2D, iso and walkthrough are three views of the same geometry. One stage at a time, ending with `pnpm check` → `geometry:check` → `/impeccable audit` → Slop list → acceptance report → commit. TS strict with no `any`. Data goes only through `lib/repo.ts`. 3D is procedural primitives only, with no external assets. No new dependency without asking. If the spec doesn't cover something, ask. — [CLAUDE.md](CLAUDE.md) L7-16
- Locked stack: Next 15 App Router, TS strict, R3F + drei, zustand, Tailwind v4, shadcn/ui, Framer Motion, zod, pnpm, Node 24. Later phases add Drizzle + SQLite + Auth.js. Forbidden: other UI kits, CSS-in-JS, axios, moment, and three addons outside drei. — [PROJECT.md](PROJECT.md) L11-14
- Installed deps also include `lenis`, `lucide-react` and `class-variance-authority` (not named in PROJECT.md's stack line). Anything new still needs approval (for example postprocessing, an i18n library, analytics or a map SDK). — [package.json](package.json) L20-33
- Palette: paper `#FFFFFF`, canvas `#F4F6F1`, concrete `#E1E5DC`, slate `#39433B`, ink `#0E1310`, ironwood, moss, chalk, ash, pine `#1E6A46`, citron `#D6F25B` (only on ink/slate), marigold `#C28214`, marigold-deep `#8A5A08`, plus three status pairs. Dark mode values are specified. Banned: every gradient, purple/cyan, glow, cream/beige. — [DESIGN-SPEC.md](DESIGN-SPEC.md) §1 L14-60
- Type: Bai Jamjuree 600/700 for display and Anuphan 400/500/600 for body. Scale 13/15/17/21/26/34/46/60. Banned: Inter, Roboto, Kanit, Prompt, Sarabun, eyebrows, all-caps, labels above headings, trailing "→". — [DESIGN-SPEC.md](DESIGN-SPEC.md) §2 L62-74
- Components: radius 12px for cards and 6px for controls only. Primary button is pine at 48px tall. **No box-shadow anywhere in UI** (shadows are allowed only inside the 3D canvas). No card wrapping every section and no nested cards. — [DESIGN-SPEC.md](DESIGN-SPEC.md) §3 L76-83
- Motion: only one autonomous motion (hero diorama rotating at 8°/min). Everything else must respond to user action. Scroll-scrub is allowed only in named sections: home opening scene, travel-time band, gallery sequence. One autoplay walkthrough clip, muted, with a stop button. Banned: scroll-reveal everywhere, hover lift/zoom, marquee, bounce. `prefers-reduced-motion` must be honoured everywhere. — [DESIGN-SPEC.md](DESIGN-SPEC.md) §4 L85-94
- 3D art direction (outside Impeccable's remit): Hemisphere `#FFF3E0`/`#9AA78C` 0.75, Directional `#FFE9C4` 0.9 with PCFSoft shadow, a single window spot `#FFB870` 0.4, ACESFilmic, sRGB. MeshStandard roughness .85-.95, metalness 0. Fixed 3D palette (woods, walls, sage, warm fabric, ceramic). No .glb/.gltf without approval. ≥2 "living" objects per room. No halo or spotlight around the diorama. — [DESIGN-SPEC.md](DESIGN-SPEC.md) §5 L96-104
- Voice: the project owner walks you through the house in short sentences with real numbers. Banned words include เหนือระดับ, เอ็กซ์คลูซีฟ, ทำเลศักยภาพ, สัมผัสประสบการณ์, ตอบโจทย์ทุกไลฟ์สไตล์ and ที่สุดแห่ง…, plus em-dash spam. — [DESIGN-SPEC.md](DESIGN-SPEC.md) §6 L105-109
- The §7 Slop Ban List covers system, visual, type, color, layout, motion, copy, illustration ("placeholder-style", "รูปใต้ overlay", "รูปแตก") and quality ("JS error", "content ค้างรอ", contrast). — [DESIGN-SPEC.md](DESIGN-SPEC.md) §7 L111-121
- Evidence rules: there are no real photos, so all house, plan and site imagery must come from the project's own 3D renders (`pnpm render:stills`). Unsplash may be used only in sections not about the house or plan, labelled "ภาพตัวอย่าง ไม่ใช่ภาพจากโครงการ" with photographer credit. No people photos in the residents' voices section. Location must reference real, verifiable places. No testimonials, awards or sales figures may be invented. — [PRODUCT.md](PRODUCT.md) L65-75
- The product requires **Thai + English from the start**, with copy and data separated from components. The i18n mechanism is undecided, and a library would need approval. — [PRODUCT.md](PRODUCT.md) L13-15, L47-48
- Target context: buyers on mobile over 3G/4G, outdoors, one-handed. 3D page weight must cope with that. Every 3D view must have a non-3D equivalent (2D plan plus numbers). — [PRODUCT.md](PRODUCT.md) L40-41, L89
- Later-phase backlog already names production items: B1 Drizzle/SQLite, B2 Auth.js + argon2 + rate limit, B3 Server Actions, B4 sharp uploads, B5 security gate, L2 SEO (metadata, OG from diorama, JSON-LD, sitemap), L3 Docker/Caddy/CI/backup/uptime. — [PROMPTS.md](PROMPTS.md) L240-249
- Developer feedback appended to PROMPTS: a draggable sun to see light from morning to evening, flood-risk estimation, and viewing floors 2-3. — [PROMPTS.md](PROMPTS.md) L252-255
- Confirmed owner brief (memory, 2026-10-02): keep the hero iso house, OpeningStatement and the repo numbers. Merge the two disliked village plans (3D MasterPlanScene in the hero and the 2D band) into one: warm wood, status on plot plates plus labels, tilt to top-down, then crossfade to a 2D drafting plan. Shorten the 520svh scene. Unsplash is allowed in non-plan sections. **Motion work waits until the owner edits §4.** — user memory `landing-rework-brief.md`

### Inferences
- "Production-grade" here cannot mean adding shadows, gradients, glassmorphism, stock hero photos or scroll-reveal. The levers left are 3D render quality, real content and trust information, SEO/meta, resilience (fallbacks), i18n, and backend phases B1-B5.
- Any postprocessing (SSAO, bloom) would need a new dependency (`@react-three/postprocessing` or three/examples addons) and arguably changes the §5 lighting spec, so it needs owner approval.

### Gaps
- DESIGN-SPEC §4 is pending an owner edit (per memory), so what motion is allowed next is unknown.
- The i18n mechanism is undecided (PRODUCT.md L13-15).

## Q2. Route and component inventory, and missing app states

### Takeaway
All 7 public routes and the admin mock exist, and error.tsx, global-error.tsx and not-found.tsx were recently added (still uncommitted). There are **no** `loading.tsx`, favicon/icon, OG/Twitter image, sitemap, robots, manifest, per-page descriptions, `generateMetadata` for house-type pages, JSON-LD, skip link, or language switch. Four dev-only pages ship ungated to production.

### Cited Findings
- Public routes: `/` ([page.tsx](src/app/(site)/page.tsx)), `/house-types`, `/house-types/[slug]` (SSG via `generateStaticParams`, L10-12), `/master-plan`, `/gallery`, `/location`, `/register`. Admin: `/admin` (Overview), `/admin/plots`, `/admin/house-types`, `/admin/gallery`, `/admin/leads`, `/admin/login`. Dev/tool routes: `/design-system`, `/dev`, `/furniture`, `/plan`, `/render/[slug]`. — `find src -type f` listing
- Error/404 states exist (all untracked in git): `src/app/(site)/error.tsx` (client ErrorView with retry and home button, L11-33), `src/app/error.tsx` (re-export), `src/app/global-error.tsx` (own html/body, L8-28), `src/app/(site)/not-found.tsx` (links to plan, house types, home, L8-23), `src/app/not-found.tsx` (wraps SiteLayout, L8-14). — those files
- **No `loading.tsx`** anywhere under `src/app`. — `find` (no match)
- **No favicon/icon, apple-icon, opengraph-image, twitter-image, sitemap, robots or manifest** in `src/app` or `public`. `public/` contains only `renders/`. Live probe returned 404 for `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/manifest.webmanifest` and `/opengraph-image`. — `ls public`; live probe
- Root metadata is only `title: "เดอะ โกรฟ"`. There is no `description`, `metadataBase`, `openGraph`, `twitter`, `viewport/themeColor`, `alternates` or title template. — [src/app/layout.tsx](src/app/layout.tsx) L19-21
- Per-page metadata is a static title only (e.g. gallery L7, location L6, master-plan L6, register L6, house-types L5). `/house-types/[slug]` has **no metadata at all**, so every house page is titled just "เดอะ โกรฟ". Repo-wide grep finds no `generateMetadata`, `openGraph` or `ld+json`. — [house-types/[slug]/page.tsx](src/app/(site)/house-types/[slug]/page.tsx) L1-108; grep
- `next.config.ts` is bare (`reactStrictMode` only): no `images` config, security headers, redirects or `poweredByHeader:false`. — [next.config.ts](next.config.ts) L1-7
- Dev pages `/design-system`, `/dev`, `/furniture` and `/plan` have no `NODE_ENV` gate and no `robots: noindex`. Only `/render/[slug]` calls `notFound()` in production (L18) and sets `robots:{index:false}` (L9). — grep in `src/app/design-system/page.tsx`, `dev/page.tsx`, `furniture/page.tsx`, `plan/page.tsx`; [render/[slug]/page.tsx](src/app/render/[slug]/page.tsx) L9, L18
- Header is a wrapping row of 5 text links with 44px targets and `aria-current`. There is no mobile menu or sticky header, and no skip-to-content link anywhere. — [SiteHeader.tsx](src/components/site/SiteHeader.tsx) L5-18; [NavLinks.tsx](src/components/site/NavLinks.tsx) L6-40; grep "skip" (no match)
- `<html lang="th">` is hard-coded, and there is no locale routing or EN copy anywhere, which conflicts with PRODUCT.md's TH+EN requirement. — [layout.tsx](src/app/layout.tsx) L25; grep i18n/locale (no match)
- Home `<h1>` lives in OpeningStatement, after a 520svh scroll scene. The first viewport has only a `section aria-label` and a cue `<p>`. — [OpeningStatement.tsx](src/components/site/OpeningStatement.tsx) L38; [HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L200
- Admin auth is a demo: `signIn` sets cookie `grove.session="demo"` for any input, and middleware checks only that the cookie exists. Phase B2 (Auth.js + argon2) is noted as a TODO. — [src/lib/auth.ts](src/lib/auth.ts) L7-18; [src/lib/session.ts](src/lib/session.ts) L1-3; [src/middleware.ts](src/middleware.ts) L5-17
- The data layer is a mock: `repo = mockRepo`, which parses JSON with zod at import time. Admin edits and leads persist to the browser's localStorage via zustand `persist` (`lib/demo.ts`, "this whole file disappears in B3"). — [src/lib/repo.ts](src/lib/repo.ts) L15; [src/lib/repo.mock.ts](src/lib/repo.mock.ts) L10-25; [src/lib/demo.ts](src/lib/demo.ts) L9-11
- Admin house-type edits explicitly do not reach the public site ("ในโหมดเดโมค่าที่แก้ยังไม่ขึ้นบนหน้าเว็บ"). Gallery uploads are object URLs that live in the tab only. — [admin/(panel)/house-types/page.tsx](src/app/admin/(panel)/house-types/page.tsx) L13; [admin/(panel)/gallery/page.tsx](src/app/admin/(panel)/gallery/page.tsx) L13; [GallerySlots.tsx](src/components/admin/GallerySlots.tsx) L75, L92-93
- Repo hygiene: no README, no `.github/` CI, no `.env.example` (it is referenced by `.gitignore`), and no Dockerfile/Vercel config. `docs/qa-s9.md` says the Vercel preview was never deployed. — `ls -A`; [.gitignore](.gitignore); [docs/qa-s9.md](docs/qa-s9.md) L109-120
- Tests: `e2e/smoke.spec.ts` covers fonts and tokens, 2D area vs geometry, 3D openings, home scroll, master-plan counts and filters, every route (one h1, no horizontal scroll), the register form and walkthrough enter/exit. `e2e/admin.spec.ts` covers login gating, admin→plan live status and form→leads. — [e2e/smoke.spec.ts](e2e/smoke.spec.ts) L3-184; [e2e/admin.spec.ts](e2e/admin.spec.ts) L8-115
- Live probe note: during the audit `/house-types/baibua` returned 200 and then 500 with `ENOENT … .next\server\pages\_document.js`. The dev server's `.next` was in a broken or concurrently rebuilt state. This is an environment issue, not a code finding. — live probe

### Inferences
- The SEO/share surface (OG image, description, sitemap, robots, JSON-LD, favicon) is the cheapest, most visible "this is a demo" tell. Sharing a link on LINE or Facebook currently shows no image or description and a generic title.
- Ungated dev routes are a production-leak risk (they are indexable and expose internal tooling).

### Gaps
- No Lighthouse rerun was done for this audit. The last numbers (home Perf 68, others 85-97) predate the uncommitted rework. — [docs/qa-s9.md](docs/qa-s9.md) L15-27

## Q3. Imagery: what the site relies on and where placeholder or sample visuals remain

### Takeaway
All house, plan and village imagery is self-rendered PNG stills from the real 3D scene (11 files, 150-366 KB each, about 2 MB total), shot by a Playwright script using **SwiftShader software GL**. Unsplash appears only in the gallery's "angles we'll shoot" strip (4 stock images plus 1 render) and is captioned. There is no real photography, the house-type `images[]` arrays are empty, and the hero poster is a faint SVG outline rather than a render.

### Cited Findings
- `public/renders/`: baibua-iso(.png, -h08, -h17), baibua-walk, rommai-iso(-f1,-f2), lomyen-iso(-f1,-f2), village. All are PNG, about 150-366 KB each. — `ls -la public/renders`
- Renders come from `scripts/render-stills.mjs`. It launches Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`, viewport 960×720 (iso), 1280×800 (walk) and 1280×720 (village) at `deviceScaleFactor: 1.5`, emulates reduced motion, and screenshots `/render/[slug]?view&hour&floor`. — [scripts/render-stills.mjs](scripts/render-stills.mjs) L1-40
- Render manifest: `renders.json` lists 11 shots. 8 are `reel:true` (gallery filmstrip) and 3 base iso shots are `reel:false` (used as thumbnails). Git status shows `baibua-iso-h12.png` and `baibua-walk-h17.png` deleted in the working tree. — [src/data/renders.json](src/data/renders.json) L3-115; git status
- Where renders are used: gallery Filmstrip (`next/image`, first frame `priority`) at [gallery/page.tsx](src/app/(site)/gallery/page.tsx) L28-36 and [Filmstrip.tsx](src/components/site/Filmstrip.tsx) L110-116; home walk still `/renders/${slug}-walk.png` at [page.tsx](src/app/(site)/page.tsx) L176-189; 8rem iso thumbnails in AudienceFit at [AudienceFit.tsx](src/components/site/AudienceFit.tsx) L92-99.
- Unsplash: `gallery.json` has 5 entries. Four are `images.unsplash.com` (shot-front, shot-living, shot-kitchen, shot-park), each captioned "ภาพตัวอย่าง ไม่ใช่ภาพจากโครงการ · ภาพโดย … บน Unsplash". One (shot-aerial) is `/renders/village.png`. The `plannedShots` list has 6 shots, and `shot-street` has no image. — [src/data/gallery.json](src/data/gallery.json) L1-42; [src/data/site.json](src/data/site.json) plannedShots
- `SampleImage` renders a raw `<img>` (eslint-disabled `no-img-element`) and resizes by rewriting Unsplash `w=`/`h=` query params. It is used only in the gallery's lower "มุมที่จะถ่ายจริงเมื่อบ้านเสร็จ" section at 640px with `hideCaption` (the caption is re-rendered below). — [SampleImage.tsx](src/components/site/SampleImage.tsx) L19-35; [gallery/page.tsx](src/app/(site)/gallery/page.tsx) L53-86
- `HouseType.images` is `[]` for all three houses (baibua, rommai, lomyen). House cards show only an SVG `HouseOutline`, not a render. — [src/data/house-types.json](src/data/house-types.json) L12, L614, L1488; [HouseCard.tsx](src/components/site/HouseCard.tsx) L20-23
- Hero loading poster is `HouseOutline` at `opacity-40` until WebGL is ready, not the existing `baibua-iso.png` still. — [HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L206-214
- The "Voices" section is a designed empty state of three "รอผู้อยู่จริง" cards (no images, no fake quotes). — [VoicesPending.tsx](src/components/site/VoicesPending.tsx) L7-36; [page.tsx](src/app/(site)/page.tsx) L194-202
- The location page has no embedded map, only a Google Maps link button with a note "ตำแหน่งโครงการยังรอยืนยัน · หมุดในแผนที่เป็นจุดโดยประมาณ". — [location/page.tsx](src/app/(site)/location/page.tsx) L11-35

### Inferences
- Software-GL capture at 1.5× DPR caps still quality (limited AA, no GPU-only features). Re-rendering on GPU at 2× and serving WebP/AVIF (or letting `next/image` do it) would sharpen the most-seen visuals at no spec cost.
- "Waiting for real content" slots (Voices, planned shots, location pending, empty `images[]`) are honest per PRODUCT.md, but together they read as unfinished. The plan should decide which to fill with renders and which to hide until real.

### Gaps
- I did not visually inspect the PNGs for artefacts. Render quality judgments are inferred from the pipeline settings only.

## Q4. 3D lighting, tone-mapping, shadows and materials

### Takeaway
All three canvases (IsoCanvas used for the hero, plan and village; WalkthroughScene) use the exact §5 lights with ACESFilmic and sRGB, `shadows="soft"`, `dpr [1,2]` and MeshStandard materials at roughness ≈0.9 / metalness 0. There is no environment map, AO, contact shadows or postprocessing, so the look is flat-lit primitives. A concrete bug: `shadows="soft"` maps to `PCFSoftShadowMap`, which **three r186 has removed**. It logs a warning and silently falls back to hard-edged `PCFShadowMap`.

### Cited Findings
- IsoCanvas `<Canvas>` settings: `frameloop` is `"always"` when scroll-live and `"demand"` otherwise; `shadows="soft"`, `dpr={[1, 2]}`, `orthographic`, `gl={{ toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, antialias: true }}`. — [IsoCanvas.tsx](src/components/three/IsoCanvas.tsx) L301-313
- IsoCanvas lights: `hemisphereLight` (LIGHT.hemiSky/hemiGround, 0.75) plus `directionalLight` (LIGHT.sun, 0.9, `castShadow`). Shadow map is 4096² for the scroll hero and 2048² otherwise, frustum ±shadowSpan sized to the scene, `shadow-normalBias={0.03}`, sun position from `sunPosition(hour)`. No `shadow-radius` is set. — [IsoCanvas.tsx](src/components/three/IsoCanvas.tsx) L267-270, L319-340
- Light constants: hemi `#FFF3E0`/`#9AA78C` at 0.75, sun `#FFE9C4` at 0.9, windowSpot `#FFB870` at 0.4 (matches §5). Camera az 225°, el 35°, radius 40. — [materials.ts](src/components/three/materials.ts) L23-31, L50-54
- Window spot: FloorPlanScene adds one `spotLight` (windowSpot 0.4, angle 0.7, penumbra 0.8, decay 0) placed outside the first window. — [FloorPlanScene.tsx](src/components/three/FloorPlanScene.tsx) L370-392
- WalkthroughScene `<Canvas>`: `shadows="soft"`, `dpr [1,2]`, perspective `fov 72`, near 0.05, far 120, ACESFilmic plus sRGB plus antialias. Same hemi and sun, with a fixed shadow frustum of ±12 m, 2048² map and `shadow-bias=-0.0008`. One warm `pointLight` per room (`#FFB870`, intensity 2.4, distance 7, decay 1.4) without castShadow. The ceiling is a plane. — [WalkthroughScene.tsx](src/components/three/WalkthroughScene.tsx) L258-341
- **Shadow-type bug:** R3F maps `shadows="soft"` to `THREE.PCFSoftShadowMap` ([node_modules/@react-three/fiber/dist/events-*.esm.js] L1582-1591). three r186 `WebGLShadowMap.render` then does `warn('WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.'); this.type = PCFShadowMap;`. — [node_modules/three/src/renderers/webgl/WebGLShadowMap.js](node_modules/three/src/renderers/webgl/WebGLShadowMap.js) L99-104; three `^0.186.1` in [package.json](package.json) L31
- Materials: every mesh is `meshStandardMaterial` with roughness 0.85-0.95 and metalness 0. A few pieces use 0.6/0.7 (furniture L238, L257, L305), which is slightly outside §5's .85-.95. Colors come from M3D. There are no textures, normal maps or env maps. — [furniture/index.tsx](src/components/three/furniture/index.tsx) L20, L238, L257, L305; [MasterPlanScene.tsx](src/components/three/MasterPlanScene.tsx) L28
- Grep finds no `Environment`, `ContactShadows`, `AccumulativeShadows`, `SoftShadows`, `EffectComposer`/SSAO, `fog` or `envMap` anywhere in `src/components` or `src/app`. — grep
- Village houses are box primitives (storey box, slab with eave, door panel). Lawn plates are colored by status. There is no instancing or merging. The QA doc measured 265 draw calls / 67k triangles for the hero diorama. — [MasterPlanScene.tsx](src/components/three/MasterPlanScene.tsx) L20-130; grep Instances (none); [docs/qa-s9.md](docs/qa-s9.md) L57-65
- Furniture is now populated (baibua 36, rommai 56, lomyen 60 pieces), so QA known issue 4.5 ("ร่มไม้/ลมเย็น furniture: []") is stale. — node count over `src/data/house-types.json`
- Reduced motion: IsoCanvas disables autorotate and damping and snaps instantly. The hero drops the 520svh scroll track and village. — [IsoCanvas.tsx](src/components/three/IsoCanvas.tsx) L272-273, L351, L365; [HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L200, L231-237, L277
- WebGL/chunk failure handling: only `MasterPlan3D` wraps the canvas in an error boundary with fallback to 2D. HeroDiorama and PlanViewer use `next/dynamic` with **no** error boundary or WebGL-unavailable fallback. — [MasterPlan3D.tsx](src/components/site/MasterPlan3D.tsx) L42-70; grep `Boundary|onError` in HeroDiorama/PlanViewer (none)

### Inferences
- Fixing the shadow type (`shadows` → `"percentage"`/`true` plus `shadow-radius`, or `"variance"`) restores the soft shadows §5 intends without breaking the spec. This is a low-risk, high-visibility quality fix.
- The flat look comes from hemi plus a single sun with no indirect light or AO. Within drei (already allowed), `<ContactShadows>`, `<AccumulativeShadows>`/`<SoftShadows>` or `<Environment>` with a procedural `Lightformer` could add depth, but each alters §5's "exact values" lighting. Treat these as an owner decision.

### Gaps
- I could not measure FPS or see live renders. Visual quality of shadows was not observed in a browser.

## Q5. Copy, content and trust gaps

### Takeaway
Copy follows §6 well (numbers derived from data, honest "pending" states, demo disclaimer). Production-trust content is missing entirely: no developer or company identity, no license/permit info, no privacy policy, **no PDPA consent on the lead form**, placeholder contacts, no payment terms/FAQ/common fees, an unverified location, and no EN version.

### Cited Findings
- Contacts are placeholders: `contactPhone "02-000-0000"`, `contactEmail "sales@thegrove.example"`, `lineId "@thegrove"`. Flags `locationPending: true` and `demo: true`. — [src/data/site.json](src/data/site.json) L3-8
- Location: Hang Dong, Chiang Mai, lat 18.6889 / lng 98.9203, `approximate: true`. Five nearby places with km/min values that QA says were not measured on Google Maps. — [site.json](src/data/site.json) location; [docs/qa-s9.md](docs/qa-s9.md) L104-107
- Footer shows the project name, district, plot count, tel/email/LINE, and a demo disclaimer ("เว็บชุดนี้เป็นงานตัวอย่าง ข้อมูลโครงการและราคาเป็นข้อมูลสมมติ…") with a "ลองเข้าหลังบ้าน" admin link. There is no company name, address, ©, privacy or terms link. — [SiteFooter.tsx](src/components/site/SiteFooter.tsx) L10-65
- RegisterForm validates with zod and saves to localStorage via `saveLead`. It de-duplicates by phone+plot and shows a confirmation ("ทีมขายจะโทรกลับภายในวันทำการถัดไป"). **There is no consent checkbox or PDPA notice and no privacy link.** Grep for consent/PDPA/ยินยอม/นโยบาย/privacy returns nothing. There is also no honeypot, rate limit or server submission. — [RegisterForm.tsx](src/components/site/RegisterForm.tsx) L12-13, L64-103, L290-292, L337-378; grep
- Repo-wide grep for ผ่อน, เงินดาวน์, FAQ/คำถามที่พบบ่อย, บริษัท, ผู้พัฒนา, ใบอนุญาต, โฉนด, ค่าส่วนกลาง, นโยบายความเป็นส่วนตัว and © finds no trust or finance content in UI copy. Hits are only geometry/plan internals ("ส่วนกลาง" as an amenity). — grep
- Home "how it works" says "ไม่มีขั้นไหนที่ต้องจ่ายก่อนเห็นของจริง" with four steps, but no booking fee, contract or payment schedule is given. — [page.tsx](src/app/(site)/page.tsx) L204-235
- Prices are mock but consistent: 18 plots (available 10 / reserved 3 / sold 5), house `priceFrom` of 4.29 M / 5.45 M / 3.69 M baht. — `src/data/plots.json` count; [house-types.json](src/data/house-types.json) L11, L613, L1487
- Voices section is honestly empty ("โครงการยังขายอยู่ ยังไม่มีใครย้ายเข้า"). — [page.tsx](src/app/(site)/page.tsx) L196-201
- §6 banned-word grep was clean at S9 and there are no stray hex values outside globals.css/materials.ts (re-checked now: 0 hits). — [docs/qa-s9.md](docs/qa-s9.md) L45-51; grep

### Inferences
- For a Thai housing-estate site to read as real, the biggest content gaps are: developer identity and permit number (ใบอนุญาตจัดสรรที่ดิน), a PDPA consent line plus privacy page on the lead form, payment/booking terms, common-area fee, an FAQ, and a real map embed or static map. All of these need owner-supplied facts, because §6 and PRODUCT.md forbid inventing them.
- A PDPA-compliant consent checkbox can be added without new dependencies and within the tokens.

### Gaps
- Real developer data, permit numbers, payment terms and the verified location all depend on the owner. None exist in the repo.

## Q6. Accessibility and performance hints

### Takeaway
Fundamentals are solid: next/font with Thai subsets, next/image for renders, dynamic import of three.js, reduced-motion in Lenis, IsoCanvas, Filmstrip and the hero, 44px targets, aria on plans, and A11y 96-100 at S9. Remaining risks: home Perf 68 / TBT 2.1 s from hero WebGL, CLS 0.255 on /register from font swap, chip contrast conflicts, no skip link, missing per-page metadata, and the 520svh scroll scene on mobile.

### Cited Findings
- Fonts: `next/font/google` Bai_Jamjuree (600, 700) and Anuphan (400, 500, 600), subsets latin+thai, `display:"swap"`, CSS variables. — [layout.tsx](src/app/layout.tsx) L5-17
- `next/image` is used in the home walk still, Filmstrip (with `priority` on the first frame and `sizes`) and AudienceFit. Raw `<img>` is used for Unsplash (SampleImage) and admin object URLs. — [page.tsx](src/app/(site)/page.tsx) L1, L177-185; [Filmstrip.tsx](src/components/site/Filmstrip.tsx) L110-116, L171-176, L221-227; [SampleImage.tsx](src/components/site/SampleImage.tsx) L26-35
- Code-splitting: HeroDiorama and PlanViewer `next/dynamic` IsoCanvas, FloorPlanScene, MasterPlanScene, RiseIn and WalkthroughScene. MasterPlan3D uses `React.lazy` with a retry. QA measured first-load JS dropping from about 368 kB to 109-112 kB. — [HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L35-46; [PlanViewer.tsx](src/components/site/PlanViewer.tsx) L21-28; [MasterPlan3D.tsx](src/components/site/MasterPlan3D.tsx) L20-40; [docs/qa-s9.md](docs/qa-s9.md) L33
- Reduced motion: Lenis smooth scroll is disabled under reduced motion ([SmoothScroll.tsx](src/components/site/SmoothScroll.tsx) L12-26). Filmstrip scroll behavior switches to `auto` ([Filmstrip.tsx](src/components/site/Filmstrip.tsx) L36, L66). MasterPlanViewer uses instant scroll ([MasterPlanViewer.tsx](src/components/site/MasterPlanViewer.tsx) L141). Transitions use `motion-reduce:transition-none` ([HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L207, L216).
- Lenis runs site-wide (a global rAF loop on every page), not only on the scroll-scrub sections. — [(site)/layout.tsx](src/app/(site)/layout.tsx) L8-10; [SmoothScroll.tsx](src/components/site/SmoothScroll.tsx) L17-21
- Hero scroll track is `h-[520svh]` with a `sticky h-[100svh]` stage. The live canvas runs `frameloop="always"` and a 4096² shadow map while scrolling. — [HeroDiorama.tsx](src/components/site/HeroDiorama.tsx) L200-203, L231; [IsoCanvas.tsx](src/components/three/IsoCanvas.tsx) L304, L331-332
- Last measured Lighthouse mobile: `/` Perf 68 (TBT 2,130 ms), others 85-97. A11y 96-100, Best Practices 96, SEO 90 on all pages. Known issues: CLS 0.255 on /register (font swap); status-chip contrast (sold 4.48:1, reserved 3.23:1) in conflict with §1's ≥4.5:1; axe `label-content-name-mismatch` on SVG plans. — [docs/qa-s9.md](docs/qa-s9.md) L15-27, L57-96
- SEO 90 everywhere is consistent with the missing meta description (see Q2). — [docs/qa-s9.md](docs/qa-s9.md) L19-25; [layout.tsx](src/app/layout.tsx) L19-21
- The QA doc is partly stale: it says Stage 7 admin "ยังไม่ได้ทำ" (L100-102), but admin pages, components and e2e now exist. It says furniture is empty for two houses (L97-98), but they now have 56 and 60 pieces. — [docs/qa-s9.md](docs/qa-s9.md); `src/app/admin/`; [e2e/admin.spec.ts](e2e/admin.spec.ts)

### Inferences
- A render-still poster (`baibua-iso.png` via next/image with priority) plus deferring WebGL until idle or interaction would likely lift home LCP/TBT without changing the §0 concept, since the model still becomes the hero once loaded.
- `size-adjust`/`adjustFontFallback` (next/font defaults) and reserving heights may cut the /register CLS without switching to `display:"optional"`.

### Gaps
- No fresh Lighthouse or axe run was done in this audit because the dev server's `.next` was in an error state (ENOENT `_document.js`). The S9 numbers predate the uncommitted rework.

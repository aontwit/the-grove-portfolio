# The Grove

Website for a fictional housing developer: 2 projects, 27 plots, 5 house types. Every house is a
3D isometric diorama you can cut open, restyle and walk through. Built with Next.js 15, React Three
Fiber + drei, Tailwind v4 and zod. Copy is in Thai, English and Chinese.

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm check            # typecheck + lint + prettier
pnpm geometry:check   # validates every house plan and site plan
pnpm test:e2e         # Playwright (desktop, mobile, WebGL)
```

## Portfolio case study

> The brand, projects, places and numbers are all fictional. Screenshots are in
> [`docs/screenshots/portfolio/`](docs/screenshots/portfolio/).

### The problem

Housing sites usually show a few glossy renders and a floor-plan PDF. Buyers browse on their phones
and still can't tell how big a room really is, where the sun comes in, or what the place would feel
like with their own taste in it. The developer also needs to edit plots, prices and house types
without calling a developer every time.

### What's interesting

**One geometry source, three views.** Walls, doors, windows and room sizes come from one module
(`src/geometry/`) and the JSON data. The 2D plan, the isometric diorama and the first-person
walkthrough are three renderings of that same geometry. There is no separate 3D model to keep in
sync. Change a room in the data and all three views change. `pnpm geometry:check` fails the build
when rooms overlap, leave gaps, doors lead nowhere, furniture blocks a doorway or a house doesn't fit
its plot.

**A mood configurator on the real plan.** In the isometric view of any house type
(`/projects/rim-suan/house-types/baibua`) the diorama turns into a dark stage with a small set of
controls:

- three mood presets (Cozy / Bright / Moody), with a meter that shows how close the room is to each
  one and a sentence that describes the current room
- a material tray (Wood / Stone / Fabric / Paint) for six surfaces: floor, walls, feature wall, sofa,
  bed and rug. Tap a swatch, drag it onto the room, or hover to preview it. Clicking a surface in 3D
  selects it in the tray.
- floating pins above the room that show which material is on which surface
- daylight from 06:00 to 22:00. The sun moves smoothly and changes colour. After dusk it turns to
  moonlight and the lamps inside come on.
- a slow camera orbit, and shortcuts: `1`–`3` moods, `[` `]` time, `/` hide the panels
- on phones the panels collapse into a bottom sheet with tabs

Colours ease towards their new values each frame, and the canvas stops drawing once everything has
settled (`frameloop="demand"`), so a still room uses no GPU. The materials belong to this scene
only, so the shared materials used by the home page and the village scene are never touched.

**Other pieces**

- Clickable master plan in 2D and 3D, with plot status filters and shareable `?plot=` links
- Scroll-driven home hero: rooms drop in one by one, then the roof closes
- Stills rendered from the live scene with `pnpm render:stills` (Playwright + GPU). The gallery,
  OG image and WebGL fallbacks all come from the same model.
- Repository pattern (`lib/repo.ts`), so the mock JSON can be swapped for a database without
  touching the UI. There is a demo admin for plots, prices and leads.
- WCAG 2.2 AA checked with axe. Every colour pair in `DESIGN-SPEC.md` §1 is measured.

### Stack

Next.js 15 (App Router) · TypeScript strict · React Three Fiber + drei · postprocessing (N8AO) ·
zustand · Tailwind v4 · Framer Motion · GSAP SplitText (home hero only) · next-intl · zod ·
Playwright + axe

# Production-grade polish signals for a Next.js 15 + React 19 + Tailwind 4 site

Context checked in repo: `package.json` pins `next ^15.5.27`, `react ^19.3.0`, `tailwindcss ^4.3.3`, `three ^0.186.1`, `@react-three/fiber ^9.8.1`, `framer-motion ^13.4.6`. The live Next.js docs fetched are now for **v16.3.8**, so every Next API note below flags where v15 and v16 differ. The repo already has untracked `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` and `(site)/error.tsx` / `(site)/not-found.tsx` (from git status), so the error-page basics are partly started.

## 1. Performance and perceived performance

### Takeaway
Ship against the official CWV "good" lines at p75 (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). The biggest wins for this kind of site come from: one preloaded hero image with correct `sizes`, AVIF+WebP, self-hosted Thai fonts with a metric-matched fallback, and three.js kept out of the first-load bundle (client-only `next/dynamic`, with a static render still shown while it loads).

### Cited Findings
**Core Web Vitals thresholds (still current; no change announced for 2025/26)**
- LCP good ≤ 2500 ms, needs improvement 2501–4000 ms, poor > 4000 ms. INP good ≤ 200 ms, needs improvement 201–500 ms, poor > 500 ms. CLS good ≤ 0.1, needs improvement 0.11–0.25, poor > 0.25. — [web.dev: Defining CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- Measured at the 75th percentile of page loads, split by mobile and desktop. p75 means 3 of 4 visits meet the target and resists outliers: 25 of 100 samples must be outliers to move p75, against 5 for p95. — [web.dev: Defining CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds); [web.dev: Web Vitals](https://web.dev/articles/vitals)
- All three metrics are "Stable". CWV "won't change more than once per year", with advance notice. — [web.dev: Web Vitals](https://web.dev/articles/vitals)

**next/image**
- `sizes`: required in practice when using `fill` or CSS-responsive images. Without `sizes`, the browser assumes `100vw`, which "can cause unnecessarily large images to be downloaded". Without `sizes`, Next generates only a 1x/2x srcset. With `sizes`, it generates a full width-descriptor srcset (640w, 750w…). — [Next.js Image docs (v16.3.8)](https://nextjs.org/docs/app/api-reference/components/image)
- `priority` was deprecated in **Next 16** in favour of `preload`. **On Next 15 (this repo), `priority` is still the correct prop.** Use preload/priority only for the single LCP/hero image. Do not use it when several images could each be the LCP depending on viewport, or together with `loading`/`fetchPriority`. Docs: "In most cases, you should use `loading="eager"` or `fetchPriority="high"` instead of `preload`." — [Next.js Image docs](https://nextjs.org/docs/app/api-reference/components/image)
- `loading` defaults to `lazy`. — [Next.js Image docs](https://nextjs.org/docs/app/api-reference/components/image)
- `placeholder="blur"`: `blurDataURL` is added automatically for **static imports** of jpg/png/webp/avif. For dynamic or remote src you must supply it yourself (e.g. Plaiceholder). "A large blurDataURL may hurt performance. Keep it small." — [Next.js Image docs](https://nextjs.org/docs/app/api-reference/components/image)
- `formats` default is `['image/webp']`. `['image/avif','image/webp']` serves AVIF first with WebP fallback. AVIF takes about 50% longer to encode but is about 20% smaller than WebP. Each format is cached separately. A CDN/proxy must forward the `Accept` header. Docs still say "We still recommend using WebP for most use cases." — [Next.js Image docs](https://nextjs.org/docs/app/api-reference/components/image)
- `qualities` default became `[75]` in v16. A `quality` outside the allowlist is coerced to the nearest allowed value. `minimumCacheTTL` defaults to 14400 s (4 h). Static imports get content-hashed `immutable` caching. — [Next.js Image docs](https://nextjs.org/docs/app/api-reference/components/image)

**next/font**
- `next/font` self-hosts Google and local fonts at build time ("No requests are sent to Google by the browser") and is designed for zero layout shift. — [Next.js Font docs](https://nextjs.org/docs/app/api-reference/components/font)
- `display` defaults to `'swap'`. `preload` defaults to `true`. With `preload: true`, `subsets` you list get `<link rel=preload>`, and listing no subsets gives a warning. — [Next.js Font docs](https://nextjs.org/docs/app/api-reference/components/font)
- `adjustFontFallback`: with Google fonts (default `true`), Next generates a metric-adjusted fallback to cut CLS. With local fonts the default is `'Arial'`, or `'Times New Roman'`/`false`. `declarations` (local only) allows `ascent-override`, `descent-override` and similar. — [Next.js Font docs](https://nextjs.org/docs/app/api-reference/components/font)
- Fonts are preloaded only on routes whose page/layout uses them, so define them once in a `fonts.ts` and use them from the root layout for site-wide faces. Docs say to "use multiple fonts conservatively". — [Next.js Font docs](https://nextjs.org/docs/app/api-reference/components/font)
- Tailwind 4 integration: expose `variable: '--font-x'` on `<html>`, then `@theme inline { --font-sans: var(--font-x); }`. — [Next.js Font docs](https://nextjs.org/docs/app/api-reference/components/font)
- "Preload fonts" and "Ship only the code points/scripts you use." — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

**Lazy-loading three.js**
- `next/dynamic` = `React.lazy` + Suspense. `{ ssr: false }` works **only inside Client Components** and errors in Server Components. `loading: () => …` supplies the fallback. When a Server Component dynamically imports a Client Component, automatic code splitting is "currently not supported", so put the `dynamic()` call in a `'use client'` wrapper. — [Next.js lazy-loading guide](https://nextjs.org/docs/app/guides/lazy-loading)
- Libraries can be pulled on demand with `await import('lib')` inside an event handler, for example on "enter 3D" click. — [Next.js lazy-loading guide](https://nextjs.org/docs/app/guides/lazy-loading)

**Skeleton vs spinner**
- Under 1 s: no indicator needed. 2–10 s: a spinner or skeleton is fine. Over 10 s: use a progress bar. Full-page loads under 10 s: skeleton is best because it previews the layout. Spinners suit a single module (a video or card). For upload/convert-type processes, use a progress bar, not a skeleton. — [NN/g: Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- Loading buttons: keep the original label and add an indicator, with a show-delay of about 150–300 ms and a minimum visible time of about 300–500 ms to avoid flicker. Mutations (`POST/PATCH/DELETE`) should complete in under 500 ms. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

### Inferences
- For The Grove, the hero/LCP element is most likely a pre-rendered still (`public/renders/*.png`). Serve it through `next/image` with `priority` (v15), an accurate `sizes`, and a static import so blur is automatic. Mount the R3F canvas client-only on top, after first paint, so the canvas never becomes the LCP candidate and the 3D bundle stays out of the critical path.
- Measure CLS around the 3D canvas mount and the font swap. Reserve the canvas box with an explicit aspect-ratio container.
- The PNG renders in `public/renders` should go through `next/image` (AVIF/WebP), not raw `<img>`. Raw PNG renders are a common prototype tell.

### Gaps
- No official figure was found for Thai-specific size savings from `subsets: ['thai']` compared with the full font. Google Fonts unicode-range splitting serves Thai as its own slice, but this was not verified this session.
- Lighthouse CI budget syntax (`budget.json` / `assertions` in `lighthouserc`) was not fetched. Typical gates teams use (perf ≥ 90, a11y = 100, JS ≤ ~170 KB gz first load) are folklore here and not cited.

## 2. States production apps always have

### Takeaway
A "finished" site has every async surface covered: route-level loading (skeleton), empty, inline field errors, a success state, pending/disabled submit, a branded 404, segment error boundaries plus `global-error`, and a fallback for the WebGL scene (no WebGL, reduced motion, still loading).

### Cited Findings
- Forms: every control has a `<label>`. Keep submit **enabled until submission starts**, then disable during the in-flight request. Allow submitting incomplete forms so validation shows. Show errors next to their fields and focus the first error on submit. Set `autocomplete` and meaningful `name`. Enter submits when a single text input is focused. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- Mobile inputs need font-size ≥ 16 px, or iOS Safari zooms on focus. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- Destructive actions need a confirmation or an Undo window. Use optimistic UI when success is likely and reconcile with the server response. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- WCAG 2.2 3.3.7 Redundant Entry (A): don't ask again for information already entered; auto-populate or let the user select it. — [W3C: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- Loading-state thresholds (skeleton/spinner/progress): see section 1 — [NN/g](https://www.nngroup.com/articles/skeleton-screens/)

### Inferences
- The following are from Next.js App Router conventions in prior knowledge, not re-fetched this session. `loading.tsx` wraps the segment in Suspense. `error.tsx` must be a Client Component and receives `error` + `reset`. `global-error.tsx` replaces the root layout, so it must render its own `<html><body>`. `not-found.tsx` is rendered by `notFound()` and for unmatched URLs. Production checklist: every route group has loading/error/not-found; the 404 keeps the site header and offers paths back (home, master plan); the 500 has a retry (`reset()`).
- The register form needs these states: idle, pending (button keeps label plus spinner, inputs read-only), success (a confirmation in place with next step and timeline, not just a toast), server error (keep entered data, explain in the owner's voice), and offline (`navigator.onLine` / failed fetch, "saved, will retry", or a clear message).
- The 3D viewer needs these states: WebGL unavailable (show the pre-rendered still plus "your browser can't open the 3D model"), loading (show the still/skeleton at the final aspect ratio, not a centred spinner), and reduced motion (no auto-orbit).
- Empty states: plot list filters with zero results need a message plus a "clear filters" action. Admin tables need first-run empty copy.

### Gaps
- No primary source fetched for offline UX patterns (e.g. web.dev offline UX). Treat the offline guidance above as convention.

## 3. Micro-interactions and motion

### Takeaway
Keep UI motion under 300 ms with ease-out, animate only `transform`/`opacity`, make it interruptible, skip animation on high-frequency keyboard actions, and always ship a reduced-motion variant. View Transitions in Next 15 are experimental (flag plus `unstable_ViewTransition`), so they are polish to add, not something to depend on.

### Cited Findings
- "Your animations should also usually be shorter than 300ms". Ease-out "gives the impression of a quick response". — [Emil Kowalski: Great animations](https://emilkowal.ski/ui/great-animations)
- Animate only `transform` and `opacity` (composite-only). Other properties trigger layout and paint. Emil prefers CSS/WAAPI over rAF-based libraries (he names Framer Motion) for main-thread independence. — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
- Don't animate keyboard-initiated actions repeated often through the day. Animations should be interruptible. — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
- Honour `prefers-reduced-motion` with a reduced variant, which can still be a short fade rather than nothing. Animations must be cancelable by user input. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines); [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
- Use `:focus-visible` rather than `:focus` so pointer users don't see focus rings. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- View Transitions: Next.js 15.2 added `experimental.viewTransition: true`. React's `<ViewTransition>` is imported as `unstable_ViewTransition` and is still experimental in React 19.x. Docs call it "highly experimental and may change". — [Next.js 15.2 blog](https://nextjs.org/blog/next-15-2); secondary summary [certificates.dev](https://certificates.dev/blog/react-viewtransition-smooth-animations-made-simple)

### Inferences
- framer-motion (already a dependency) can respect the OS setting globally via `<MotionConfig reducedMotion="user">`. Tailwind 4 provides `motion-safe:` / `motion-reduce:` variants. Both are from prior knowledge and were not re-verified this session.
- Rules of thumb: hover/press feedback 100–150 ms; panels/sheets 200–300 ms enter, a bit faster exit; `:active` scale about 0.97–0.98 on buttons; never `transition: all`. These are craft norms, apart from the 300 ms ceiling cited above.
- Scroll: `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`. Set `scroll-margin-top` on anchors under a sticky header. Don't hijack scroll in 3D sections; use explicit controls instead.

### Gaps
- No stable Next 15 page-transition API. If route transitions are required, the choice is between the experimental flag and framer-motion, and the project owner should decide (CLAUDE.md rule 8).

## 4. Typography craft (Thai + Latin)

### Takeaway
Thai body text needs roughly 10–15% more leading than Latin (≥ 1.55), and display text 1.1–1.25, tested with stacked vowel and tone marks so nothing clips (inputs especially). For modern UI, use loopless Thai (IBM Plex Thai, Prompt) or looped (Sarabun) for a heritage tone. Use `text-wrap: balance` on headings, `pretty` on paragraphs, and `tabular-nums` on prices and areas.

### Cited Findings
- "Thai body text needs a line-height of at least 1.55 — about 10–15% more than Latin". "For display sizes use 1.1–1.25". Test with consonant + above-vowel + tone mark stacks. — [ThaiGraph FAQ](https://thaigraph.com/faq/)
- Modern web/app body text: loopless Thai such as **IBM Plex Thai or Prompt** "is the safer default". Traditional, governmental or heritage register: looped Thai such as **Sarabun**. — [ThaiGraph FAQ](https://thaigraph.com/faq/)
- Real-world bug: Thai stacked marks clipped inside inputs because the line box was too short, fixed by raising the input `line-height`. — [GitHub PR example](https://github.com/dufort02/wedding_inv/pull/12) (anecdotal)
- `text-wrap: balance` is for headings and captions. Chromium limits it to ≤ 6 lines and Firefox to ≤ 10, so the cost is negligible. `text-wrap: pretty` is for body copy, avoids orphans, and costs some performance. MDN marks both Baseline (since March 2024) but notes "some parts… may have varying levels of support". — [MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap)
- Use `font-variant-numeric: tabular-nums` for numbers that are compared. Use curly quotes and the `…` character. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

### Inferences
- Thai has no spaces between words. Browser line breaking relies on dictionary segmentation (ICU in Chromium/WebKit), so `balance`/`pretty` work only as well as segmentation does. Test long Thai headings, and consider manual `<wbr>` or `&#8203;` breaks in hero headlines. This was not verified with a source this session.
- Pairing: choose a Latin face whose x-height and stroke contrast match the Thai face. IBM Plex Thai pairs natively with IBM Plex Sans. Load Thai and Latin as separate `next/font` instances, or one family that covers both, and put Thai first in the stack so Latin digits come from the chosen Latin face. This is a craft norm and is not cited.
- Thai has no italics tradition. Avoid synthetic italic and use weight or colour for emphasis.
- `hanging-punctuation` is Safari-only (prior knowledge) and has little relevance to Thai, so it is low priority.
- Set `lang="th"` on `<html>` and `lang="en"` on Latin-only spans. This affects font fallback, hyphenation and screen-reader voice.

### Gaps
- No authoritative source found for Thai `letter-spacing` or recommended minimum Thai body size. ThaiGraph's pillar guide (not fetched) reportedly covers bilingual layout and web CSS.

## 5. Accessibility baseline (WCAG 2.2 AA)

### Takeaway
The AA items reviewers check first: visible focus that isn't hidden behind sticky headers or sheets (2.4.11), targets ≥ 24×24 CSS px (44 on mobile per Vercel), 4.5:1 text contrast, landmarks and a skip link, keyboard-operable flows following WAI-ARIA APG, and a non-drag alternative for any drag interaction (2.5.7). The 3D orbit and pan views need buttons for this.

### Cited Findings
- WCAG 2.2 added 9 SCs and removed 4.1.1 Parsing. The AA ones: **2.4.11 Focus Not Obscured (Minimum)**, meaning a focused component is not entirely hidden by author content (sticky header, cookie bar, bottom sheet). **2.5.7 Dragging Movements**, a single-pointer non-drag alternative. **2.5.8 Target Size (Minimum)**. **3.3.8 Accessible Authentication**. Level A: **3.2.6 Consistent Help**, **3.3.7 Redundant Entry**. AAA: 2.4.12, **2.4.13 Focus Appearance** (indicator ≥ 2 CSS px, 3:1 contrast), 3.3.9. — [W3C: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- 2.5.8: target ≥ 24×24 CSS px. Smaller targets pass if a 24 px-diameter circle centred on each does not intersect other targets. Inline text links are exempt. 2.5.5 (AAA) asks 44×44 for important controls. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- If the visual target is under 24 px, expand the hit area to ≥ 24 px; on mobile use ≥ 44 px. All flows should be keyboard-operable per WAI-ARIA Authoring Practices. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- Vercel prefers APCA over WCAG 2 contrast for perceptual accuracy. This is a design-quality opinion; compliance is still judged on the WCAG 2 ratios. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

### Inferences
- Checklist: skip link as the first focusable element, targeting `<main id="content">`; one `<h1>` per page; landmarks `header/nav/main/footer`; `aria-current="page"` on active nav; dialogs and bottom sheets use native `<dialog>` or an APG dialog pattern (focus trap, Esc closes, focus returns to the trigger, `inert` background, sheet does not cover the focused element per 2.4.11); 3D canvas has an accessible name plus an equivalent non-3D path (the 2D plan, which this project already has as a separate view of the same geometry); icon-only buttons have `aria-label`; form errors are linked via `aria-describedby` and announced with `aria-live="polite"`.
- The admin panel needs the same checks, because reviewers often test it with the keyboard.

### Gaps
- The WCAG 2 contrast thresholds (4.5:1 text, 3:1 large text and UI components) are well known but were not re-fetched this session.

## 6. "Finished product" metadata

### Takeaway
Use Next's file conventions: `favicon.ico`, `icon` and `apple-icon`, `manifest`, `opengraph-image` (1200×630, with `.alt.txt` or an `alt` export) per key route, `robots.ts`, `sitemap.ts`, `metadataBase` plus canonical, `lang="th"`, and JSON-LD with `RealEstateListing` wrapping `Offer`s for the houses (described as `House`/`Accommodation` with `floorSize`, `numberOfBedrooms` and so on).

### Cited Findings
- Metadata file conventions: favicon/icon/apple-icon, `manifest.json|ts`, `opengraph-image`/`twitter-image`, `robots.txt|ts`, `sitemap.xml|ts`. Each can be a static file or code-generated, is served hashed and cached by default, and fills `<head>` automatically. If you use middleware/proxy, exclude these from the matcher. — [Next.js Metadata Files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- `opengraph-image`: static `.jpg/.png/.gif` or a `.tsx` route returning `ImageResponse` from `next/og`. Export `alt`, `size = {width:1200,height:630}` and `contentType`. Custom fonts load via `readFile` into the `fonts` option, which is needed for Thai glyphs in generated OG images. Limits are twitter-image ≤ 5 MB and OG ≤ 8 MB, otherwise the build fails. `opengraph-image.alt.txt` sets `og:image:alt`. Generated images are statically optimized unless they use request-time APIs. In v16, `params` became a Promise; v15.x also uses async params in pages. — [Next.js opengraph-image docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- `RealEstateListing` (Thing > CreativeWork > WebPage > RealEstateListing) describes "one or more real-estate Offers". Its own properties are `datePosted` and `leaseLength`. Inherited ones include `offers`, `about`, `mainEntity`, `image`, `url`. — [schema.org RealEstateListing](https://schema.org/RealEstateListing)
- `Accommodation` (a Place) has subtypes `House`, `Apartment`, `Room`, `Suite`, `CampingPitch`, and properties `floorSize`, `numberOfRooms`, `numberOfBedrooms`, `numberOfBathroomsTotal`, `yearBuilt`, `floorLevel`, `accommodationFloorPlan`, `amenityFeature`, `tourBookingPage`, `petsAllowed`. `SingleFamilyResidence` appears in examples. — [schema.org Accommodation](https://schema.org/Accommodation)

### Inferences
- Suggested JSON-LD shape per house-type page: `RealEstateListing` { `url`, `datePosted`, `image`, `mainEntity`: `House` { `floorSize`: QuantitativeValue(unitCode `MTK`), `numberOfBedrooms`, `numberOfBathroomsTotal`, `accommodationFloorPlan` }, `offers`: `Offer` { `price`, `priceCurrency: "THB"`, `availability` } }. The site level can use `Organization` or a `Place` for the village with geo. Prices must be the real ones (CLAUDE.md rule 6).
- Google has no rich-result type for RealEstateListing (prior knowledge, not verified). The value is semantic correctness and future-proofing, not SERP features, so effort here is low priority.
- Thai OG text: next/og (Satori) needs a Thai font file passed explicitly. Without it, Thai renders as tofu. This is a common prototype tell when links are shared on LINE/Facebook.
- Others: `metadataBase` in the root layout so OG URLs are absolute; `alternates.canonical` per page; `themeColor` via the `viewport` export (light/dark); `robots` disallows `/admin` and `/render`; sitemap lists public routes only.

### Gaps
- Icon size recommendations (e.g. 180×180 apple-icon, 192/512 manifest) were not fetched from the app-icons subpage. They are standard values but uncited here.

## 7. Responsive details

### Takeaway
Use `svh` for hero and full-screen sections (stable, no jump), `dvh` only where tracking the toolbar matters (bottom sheets), plus `env(safe-area-inset-*)` with `viewport-fit=cover`. Targets ≥ 44 px on touch. Zero horizontal scroll at 320 px. Inputs ≥ 16 px.

### Cited Findings
- `svh` assumes browser UI is fully expanded, `lvh` that it is retracted, and `dvh` switches between them. dvh updates are throttled ("do not update at 60fps"), which makes it bad for animation-heavy UIs. Supported in Chrome 108+, Firefox 101+, Safari 15.4+. — [web.dev: viewport units](https://web.dev/blog/viewport-units)
- "Account for notches & insets with safe-area variables". "Only render useful scrollbars; fix overflow issues". Mobile min hit target 44 px. Inputs ≥ 16 px. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

### Inferences
- Test matrix: 320, 375, 390, 768, 1024, 1440 widths plus **landscape phone (~844×390)**, where sticky headers, bottom sheets and the 3D canvas usually break. Check `overflow-x` at every breakpoint (`document.documentElement.scrollWidth > innerWidth`).
- Bottom sheets: `padding-bottom: max(1rem, env(safe-area-inset-bottom))`, `max-height: 85dvh`, `overscroll-behavior: contain`.
- Prefer `touch-action` on the R3F canvas so page scroll still works on mobile, unless the canvas is in an explicit "interact" mode.

### Gaps
- None critical.

## 8. Quality gates

### Takeaway
Typical gates are: type check, lint, axe (zero serious/critical violations), Lighthouse CI with assertion budgets on key routes, and Playwright `toHaveScreenshot` visual regression at a few viewports, with baselines generated in the same OS/container, animations disabled and dynamic regions masked.

### Cited Findings
- Playwright `toHaveScreenshot()` writes a baseline on the first run and compares on later runs. Tolerance comes from `maxDiffPixels` (pixelmatch), set per test or in config. `stylePath` injects CSS to hide volatile content. "Browser rendering can vary based on the host OS, version, settings, hardware…" so "run tests in the same environment where the baseline screenshots were generated" (Docker/CI). Update with `--update-snapshots` and commit the snapshot directories. — [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

### Inferences
- For a WebGL scene, visual-regression the **pre-rendered stills** and 2D plan instead of the live canvas (GPU nondeterminism), or mask the canvas. The repo's `scripts/render-stills.mjs` pipeline already produces deterministic PNGs that could double as baselines.
- Add `@axe-core/playwright` scans on each public route plus one admin route (prior knowledge; check against CLAUDE.md rule 7, since a new devDependency needs approval).
- Measure real CWV on a production build (`next build && next start`) with throttled mobile. Dev-mode numbers are meaningless.

### Gaps
- Lighthouse CI budget syntax and recommended score thresholds were not fetched (tool-call budget). Recommend checking https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md before adopting.
- Playwright option details beyond `maxDiffPixels`/`stylePath` (`maxDiffPixelRatio`, `threshold`, `animations: 'disabled'`, `mask`) were not shown in the fetched summary. They exist per prior knowledge but are not cited here.

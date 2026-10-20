# QA gates — วิธีรัน

ตั้งขึ้น 2026-10-02 (แผน P2-6 / P2-7 ใน `reports/เว็บ mock ระดับ production.md`)
ผลวัดรอบล่าสุดที่มีอยู่คือ `docs/qa-s9.md` (2026-10-01 — ล้าสมัยแล้ว) · **รอบใหม่รอเฟสสุดท้าย ตอนแอปนิ่ง**

| ด่าน | คำสั่ง | ตรวจอะไร | วิ่งกับ |
|---|---|---|---|
| โค้ด | `pnpm check` | tsc strict + eslint + prettier | — |
| geometry | `pnpm geometry:check` | ห้องไม่ซ้อน/ไม่มีช่องว่าง/ประตูเชื่อมถึงกัน | — |
| e2e | `pnpm test:e2e` | ทุก spec ใน `e2e/` × project desktop + mobile (Pixel 7) | dev :3000 หรือ prod :3100 |
| a11y | `pnpm test:a11y` | axe-core แท็ก WCAG 2.0/2.1/2.2 A+AA · ตกเมื่อมี violation ระดับ serious/critical | dev หรือ prod (prod น่าเชื่อกว่า) |
| visual | `pnpm test:visual` | `toHaveScreenshot` เทียบกับ baseline | dev (ภาพนิ่ง /render มีเฉพาะ dev) |
| Lighthouse | `pnpm lighthouse` | Lighthouse mobile ทุกหน้าหลัก · เป้า Perf ≥85 · A11y ≥95 | **prod :3100 เท่านั้น** |

## เป้าหมาย dev / prod (`e2e/env.ts`)

- **dev (ค่าเริ่ม)** — `http://localhost:3000` · ถ้า `pnpm dev` เปิดค้างอยู่ Playwright ใช้ตัวนั้นเลย
  (`reuseExistingServer`) ไม่เปิดตัวที่สองมาแย่งพอร์ต · ไม่มีก็เปิด `pnpm dev` ให้เอง
- **prod** — `E2E_TARGET=prod` → `http://localhost:3100` · Playwright เปิด `pnpm start --port 3100` ให้ถ้ายังไม่มี
  แยกพอร์ตจาก dev ตั้งใจ — จะได้ไม่เผลอวัด dev server แล้วคิดว่าเป็น production

**ห้าม `pnpm build` ตอน `pnpm dev` เปิดอยู่** — ทั้งคู่เขียน `.next` ที่เดียวกัน dev server จะพังกลางทาง
ลำดับที่ถูก: ปิด dev → `pnpm build` → `pnpm start --port 3100` (หรือปล่อยให้ Playwright เปิด) → วัด → ปิด → `pnpm dev` ต่อ

ตั้งตัวแปรตาม shell:

```powershell
# PowerShell (ค่าค้างทั้ง session — ลบทิ้งเมื่อเสร็จ)
$env:E2E_TARGET = "prod"; pnpm test:e2e
Remove-Item Env:E2E_TARGET
```

```bash
# Git Bash / macOS / Linux
E2E_TARGET=prod pnpm test:e2e
```

## a11y — `e2e/a11y.spec.ts`

- route: `/` · `/house-types` · `/house-types/<slug>` ทุกแบบใน `src/data/house-types.json` · `/master-plan` ·
  `/master-plan?plot=<แปลงแรกใน plots.json>` · `/gallery` · `/location` · `/register` · `/privacy` · `/terms`
  (`e2e/routes.ts` — เพิ่มแบบบ้านใน data แล้วครอบหน้าใหม่ให้เอง) · ทุก route มีคู่ภาษาอังกฤษใต้ `/en` ตรวจด้วยเสมอ
- ขนาดจอ: 1280×800 และ 375×812 (isMobile + touch) กำหนดในไฟล์ จึงวิ่งใน project `desktop` อย่างเดียว
  (project `mobile` ข้ามไฟล์นี้ใน `playwright.config.ts`)
- `reducedMotion: "reduce"` — ไม่มีอะไรค้างกลาง transition ที่ทำให้ค่า contrast เพี้ยน · หน้าแรกจึงเป็นภาพนิ่งแทน WebGL
- ผลเต็มของ axe (รวม minor/moderate) แนบเป็น `axe-results.json` ในผลของแต่ละเทสต์ — ดูด้วย `pnpm exec playwright show-report`
  (ต้องใช้ reporter html: `pnpm test:a11y --reporter=html`)
- หลังบ้าน `/admin/*` ยังไม่อยู่ในด่านนี้

## Visual regression — `e2e/visual.spec.ts`

ถ่ายเฉพาะพื้นผิวที่ภาพออกมาเหมือนเดิมทุกครั้ง:

| ภาพ | ที่มา |
|---|---|
| `master-plan-2d` | SVG ของ `MasterPlan2D` ใน `/master-plan` (desktop แนวนอน · mobile แนวตั้ง) |
| `footer` | footer ของ `/location` — ปิดบรรทัด © ปี ไว้ |
| `register-form-empty` · `register-selection-empty` | ฟอร์มและการ์ด "ยังไม่ได้เลือกแปลง" ใน `/register` |
| `render-<id>` | `/render/<slug>` ทุกมุม iso/village ใน `src/data/renders.json` · **dev เท่านั้น** · project desktop เดียว |

ตั้งค่า: animation ปิด · caret ซ่อน · `scale: "css"` · `reducedMotion` · ซ่อน badge ของ dev server ·
ยอมต่าง 1% (DOM) / 3% (ภาพ WebGL)

**ยังไม่มี baseline** — สร้างครั้งแรกเมื่อแอปนิ่งแล้วเท่านั้น:

```
pnpm test:visual:update     # สร้าง/อัปเดต e2e/visual.spec.ts-snapshots/*.png
pnpm test:visual            # เทียบ
```

baseline ผูกกับ OS + ฟอนต์ + เบราว์เซอร์ (ชื่อไฟล์ลงท้าย `-win32` / `-linux`) — ภาพ `render-*` ผูกกับ GPU/driver ด้วย
ถ้าย้ายไปวิ่งใน CI ต้องสร้าง baseline ใหม่บนเครื่อง CI · อัปเดต baseline = ตั้งใจเปลี่ยนหน้าตา ต้องดูภาพ diff ก่อนทุกครั้ง

## Lighthouse — `scripts/lighthouse.mjs`

ไม่มี dependency ใหม่ — เรียก `pnpm dlx lighthouse@13.5.0` และใช้ Chromium ที่ Playwright ติดตั้งไว้ (`CHROME_PATH` ทับได้)

```
# ปิด pnpm dev ก่อน
pnpm build
pnpm start --port 3100      # หน้าต่างที่สอง
pnpm lighthouse
```

- โปรไฟล์ mobile ค่าเริ่มของ Lighthouse · 3 รอบต่อหน้า เก็บรอบที่ Perf เป็นค่ากลาง (`LH_RUNS=1` เร็วกว่า)
- route เดียวกับ a11y gate · วัดบางหน้า: `LH_ROUTES=/,/register` · เครื่องอื่น: `LH_BASE_URL=...`
- กันวัดผิดเครื่อง: ถ้า `/render/<slug>` ไม่ตอบ 404 (= dev server) สคริปต์หยุดทันที
- ผล: `docs/qa/lighthouse/<route>.json` (เปิดใน Lighthouse Viewer ได้) + `docs/qa/lighthouse.md` (ตารางสรุป + audit a11y ที่ตก)
- exit 1 เมื่อมีหน้าต่ำกว่าเป้า — ไฟล์ผลยังเขียนครบ

### ความเร็วหน้าแรก — สิ่งที่ต้องรักษาไว้ (2026-10-02)

วัด prod build ในเครื่อง headless โปรไฟล์สะอาด 5 รอบ (ค่ากลาง): mobile Perf 74 → 92 · LCP 5.1 → 3.2 s · FCP 3.0 → 2.0 s
desktop 98 → 100 · JS ก้อนแรกของหน้าแรก 248 → 192 KB (gzip) · CSS ที่บล็อกการวาด ~199 → ~10 KB (gzip)

- **ฟอนต์จีนโหลดเฉพาะ /zh** (`app/_meta/CjkFonts.tsx` ผ่าน next/dynamic) — CSS @font-face ของ Noto Sans/Serif SC ~190 KB gzip
  เคยติด layout ทุกหน้าทุกภาษา เป็นสาเหตุหลักของเฟรมดำก่อนภาพแรก (เบราว์เซอร์วาดอะไรไม่ได้จนโหลด CSS นี้ครบ) ห้าม import กลับเข้า `app/fonts.ts`
- **three.js ไม่อยู่ใน JS ก้อนแรก** — ฉาก 3D ของหน้าแรกตื่นเมื่อผู้ชมสะกิด (เลื่อน แตะ กดแป้น เมาส์ที่ขยับจริง) และหลังหน้าโหลดเสร็จ + เบราว์เซอร์ว่างเท่านั้น
  (`HeroDiorama` awake) · ค่ากล้องคำนวณบน server (`heroStage.ts`) ไม่ลาก `geometry/exterior` เข้า client
- zod ไม่อยู่ใน JS ของหน้าที่วาดแปลง (ผู้ลงทะเบียนแยกไป `lib/leads.ts`) · framer-motion ใน `RoomAccordion` เป็น LazyMotion
- `browserslist` ใน package.json = เกณฑ์เดียวกับ Tailwind v4 (Chrome/Edge 111, Firefox 128, Safari 16.4) — เว็บใช้ไม่ได้ต่ำกว่านี้อยู่แล้ว
- วัดใน DevTools ของ Chrome ที่มีส่วนขยาย = ตัวเลขเพี้ยน (สคริปต์ของส่วนขยายนับรวม) และถ้าขยับเมาส์บนหน้าระหว่างวัด ฉาก 3D จะตื่นจริง
  (main thread หลายวินาที) — ใช้ `pnpm lighthouse` หรือหน้าต่าง Incognito ที่ปิดส่วนขยาย และไม่แตะหน้าระหว่างวัด

### หน้าแรกพร้อม intro loader — ย้ายงาน 3D ออกจาก main thread (2026-10-03)

intro loader (5827ee6) โหลด 3D ทันทีหลัง hydrate — TBT พุ่งเพราะการรอ GPU คอมไพล์ shader + สร้างฉากในช่วงที่ Lighthouse วัด
วัด prod build แยกใน scratch worktree (`next start`) · Lighthouse 13.5.0 headless ค่ากลาง 3 รอบ · เครื่องเดียวกัน (Windows · ANGLE/D3D11)

| | ก่อน (5827ee6) | หลัง |
|---|---|---|
| mobile Perf (3 รอบ) | 48 (45/48/54) | **78** (73/78/80) |
| mobile TBT | 12.9 s | **0.45 s** (0.35–0.45) |
| mobile LCP | 4.09 s | 3.47 s (แกว่ง 3.4–3.9 ทั้งก่อนและหลัง — ไม่ใช่งาน 3D: ไม่มีไฟล์ 3D อยู่ก่อน LCP) |
| mobile long task ยาวสุด (จำลอง) | 7.0 s | 0.30 s |
| desktop Perf | 65 (64/65/65) | **99** (98/99/99) |
| desktop TBT | 2.97 s | **3 ms** |
| desktop LCP | 0.82 s | 0.83 s |
| โปรแกรม shader ที่ link (Playwright, desktop/mobile) | 39 / 40 · ทุกตัวรอแบบบล็อกตอนวาดครั้งแรก | 34 / 35 · **0 ตัว** รอแบบบล็อก |
| เวลารอ GPU แบบ sync บน main thread (desktop) | 1.54 s | 23 ms |

หน้าตา: ภาพนิ่งของ canvas เทียบพิกเซลกับก่อนแก้ (reduced motion · desktop 1440 และ Pixel 7) **ต่างกัน 0 พิกเซล** — สิ่งเดียวที่ตั้งใจเปลี่ยนคือกำแพงโครงการด้านที่หันเข้ากล้อง (ด้านล่าง)

สิ่งที่ต้องรักษาไว้ (อย่าถอดกลับ):
- **ไม่วาดเฟรมแรกจนกว่า shader ทั้งชุดคอมไพล์เสร็จ** — `IsoCanvas` ใช้ `frameloop="never"` จน `Precompile` (look.tsx `warmUp`) จบ:
  texture อัปโหลดทีละไฟล์คนละ task · `gl.compile` ทีละ (วัสดุ × ชนิด mesh) คนละ task · วัสดุ depth ของเงาแดด (ค่าเดียวกับ WebGLShadowMap) ·
  วัสดุของเงาสัมผัสพื้น · shader ของ EffectComposer (`warmPasses`) · PMREM ของ HDRI (`warmPmrem` เริ่มตั้งแต่ canvas เกิด) ·
  แล้วรอ `KHR_parallel_shader_compile` แบบไม่บล็อก + "ใช้ครั้งแรก" ทีละไม่กี่โปรแกรมต่อ task · ความคืบหน้าส่งเข้า intro loader (`introProgress.compile`)
  ทุกตัวคอมไพล์ลง render target (ฉากวาดผ่าน composer) — ถ้า key ไม่ตรงกับตอนวาดจริงจะกลับไปบล็อกในเฟรมแรกเงียบๆ: วัดด้วยการนับ `linkProgram` หลัง `ready`
- **ตรวจ WebGL ใน Web Worker** (`SceneBoundary` OffscreenCanvas) — context แรกของหน้าปลุก GPU process (~250 ms บล็อกใน Lighthouse) ให้ worker รับไป
  worker บอกไม่ได้ = ตรวจบน main thread ตอนว่างแบบเดิม · CSP ต้องมี `worker-src blob:`
- **N8AO `transparencyAware` ปิด + ตัวตรวจอัตโนมัติปิด** (callback ref ใน `PostFX`) — เดิมวาดทั้งฉากเพิ่ม 2 รอบทุกเฟรมเพราะเงาสัมผัสพื้นโปร่งใส
- **เงาสัมผัสพื้นเขียนเอง** (`GroundShadow` สูตรเดียวกับ ContactShadows ของ drei) — อบนอกเฟรม (task แยกก่อนเฟรมแรก) ไม่วาด shadow map ซ้ำตอนอบ · อบใหม่โดยไม่สร้างวัสดุใหม่
- `FloorPlanScene` memo ห้อง/ช่องเปิดตาม house — เดิมผนังทุกชิ้น extrude ใหม่และ dispose วัสดุทุก render (โปรแกรมถูกลบแล้วคอมไพล์ซ้ำ 12 ตัว)
- กล่องลบมุมของเฟอร์นิเจอร์แคชตามขนาด สร้างตอน render (ไม่ใช่ layout effect ของ RoundedBox ที่รวมเป็น task เดียว)
- three.js เริ่มโหลดหลังภาพนิ่ง (LCP) โหลด + วาดแล้ว (รอนานสุด 2.5 s) — ไม่แย่งเน็ตกับภาพ LCP

ที่ยังเหลือ (mobile ~0.35–0.45 s TBT): eval ของ three.js/R3F (~45 ms ต่อก้อนแบบไม่จำกัด CPU) · สร้าง Canvas · เฟรมแรก (~35 ms) · Layout ของหน้าเอง (มีก่อน loader)

กำแพงโครงการ (เจ้าของสั่ง 2026-10-03): ด้านที่หันเข้ากล้องย่อเหลือ 0.6 ม. + ทับหลัง (`MasterPlanScene` `PerimeterWall`) คิดทิศใน world space ทุกเฟรม
— หน้าแรกหมู่บ้านหมุนและกล้องกวาด 90° · ด้านไกลเต็มสูง 1.86 ม. · geometry:check (ฐ) ตรวจเส้นเขตเหมือนเดิม

## สิ่งที่คาดว่าจะตกในรอบแรก

- Lighthouse `/` Perf — รอบ 2026-10-01 ได้ 68 (WebGL hero, `docs/qa-s9.md` §4.1)
- axe `color-contrast` บนหน้าที่มีข้อความทับภาพ/ฉาก 3D (หน้าแรก, ภาพนิ่งในแกลเลอรี) — axe อ่านสีพื้นหลังใต้ภาพไม่ได้
  มักออกเป็น "incomplete" ไม่ใช่ violation แต่ถ้าออกเป็น violation ต้องดูด้วยตา ไม่ใช่ปิด rule

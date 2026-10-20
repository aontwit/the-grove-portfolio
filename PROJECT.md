# PROJECT.md — เดอะ โกรฟ (v2)

## สิ่งที่กำลังสร้าง

เว็บโครงการบ้านจัดสรร 18 แปลง (mock ชื่อ "เดอะ โกรฟ") — จุดขาย: แปลนบ้าน 2D↔3D isometric diorama
+ ผังโครงการคลิกเลือกแปลง + โหมดเดินดูในบ้าน (first-person) · งานพอร์ตคุณภาพ production ของสตูดิโอ
ผู้ใช้: ผู้ซื้อบ้าน (มือถือ) และเจ้าของโครงการ (แก้ข้อมูลเอง)

## Stack (ล็อก)

Next.js 15 App Router · TypeScript strict (`noUncheckedIndexedAccess`, ห้าม any) · React Three Fiber + drei ·
`@react-three/postprocessing` + `postprocessing` (N8AO มากับแพ็กเกจ — เพิ่ม 2026-10-02 เจ้าของอนุมัติ, ใช้ใน `components/three/look.tsx` ที่เดียว) ·
zustand · Tailwind v4 (`@theme` จาก DESIGN-SPEC) · shadcn/ui · Framer Motion (ตามข้อจำกัด motion ใน spec) ·
`gsap` (core + SplitText — เพิ่ม 2026-10-03 เจ้าของอนุมัติ, ใช้กับตัวหนังสือของฉากเปิดหน้าแรกใน `components/site/HeroDiorama.tsx` ที่เดียว · ไม่ใช้ ScrollTrigger: ความคืบหน้ามาจาก Lenis + ref อยู่แล้ว) ·
zod · `next-intl` (เส้นทางภาษา th/en/zh — เพิ่ม 2026-10-02 เจ้าของสั่ง, ใช้ใน `src/i18n/routing.ts` `client.tsx` และ middleware — ไม่ใช้ plugin ของ next.config (โหลด @swc/core native ตอน build) เพราะไม่ได้ใช้ API ฝั่ง server ของ next-intl) ·
pnpm · Node 24 (.nvmrc) · Phase หลัง: Drizzle + SQLite + Auth.js
devDependency ฝั่งทดสอบ: `@playwright/test` · `@axe-core/playwright` (เพิ่ม 2026-10-02 เจ้าของอนุมัติ — ตรวจ WCAG 2.2 AA ใน `e2e/a11y.spec.ts` ที่เดียว)
· Lighthouse ไม่ได้ติดตั้ง เรียกผ่าน `pnpm dlx lighthouse` ใน `scripts/lighthouse.mjs`
ห้ามเพิ่ม dependency อื่นโดยไม่ถาม (โดยเฉพาะ UI kit อื่น, CSS-in-JS, axios, moment, three addon นอก drei)

## โครงสร้าง

```
src/
├─ app/layout.tsx          # root layout ผ่านเฉยๆ — <html lang> วาดที่ layout ชั้นถัดไป (_meta/document.tsx)
├─ app/[lang]/...          # หน้าผู้ซื้อ ไทย (URL ไม่มี prefix) + อังกฤษ (/en): /, /master-plan, /house-types,
│                          #   /house-types/[slug], /gallery, /location, /register, /privacy, /terms
├─ app/admin/...           # dashboard, plots, house-types, gallery, leads (mock, ป้าย DEMO) — ไทยอย่างเดียว
├─ i18n/                   # config.ts (ภาษา, localePath) · routing.ts (next-intl) · th.ts / en.ts / zh.ts (คำของ UI) · client.tsx (useDict, Link)
├─ middleware.ts           # กัน /admin + ภาษา: rewrite ไทยไป /th ภายใน · /th/... redirect ไป URL ไม่มี prefix
├─ components/ui|site|admin
├─ components/three/       # IsoCanvas, FloorPlan{2D,Scene}, MasterPlan{2D,Scene}, WalkthroughScene, furniture/
├─ geometry/               # ★ โมดูลเรขาคณิตกลาง: walls(), openings(), roomAreas() — 2D/3D/walkthrough ใช้ตัวเดียวกัน
│  └─ validate.ts          # ★ pnpm geometry:check — ห้องห้ามซ้อน/ห้ามมีช่องว่าง/พื้นที่รวมตรง/ประตูเชื่อมถึงกันจริง
├─ data/*.json             # mock (zod validate ตอน build)
├─ lib/ schemas.ts · repo.ts (interface) · repo.mock.ts · store.ts
e2e/smoke.spec.ts · docs/ · CLAUDE.md · DESIGN-SPEC.md(ล็อก) · PRODUCT.md · DESIGN.md
```

**หลักการแกนกลาง 2 ข้อ**
1. **Repository pattern** — UI อ่านข้อมูลผ่าน `lib/repo.ts` เท่านั้น (phase หลังสลับ mock→DB โดยไม่แก้ UI)
2. **Single geometry source** — ผนัง/ประตู/ขนาดห้อง คำนวณจาก `src/geometry/` ที่เดียว
   แปลน 2D, isometric, walkthrough คือ 3 มุมมองของ geometry เดียวกัน แก้ data ที่เดียวเปลี่ยนทั้งสาม
   และ `pnpm geometry:check` คือด่าน verify ก่อนขึ้น stage ถัดไปเสมอ

## Data model (zod ใน lib/schemas.ts)

```
HouseType { id, slug, name, kind, storeys, areaSqm, beds, baths, priceFrom, images[], rooms: Room[], highlight }
Room      { id, name, x0, z0, x1, z1, desc }            # เมตร origin กลางบ้าน — ขอบห้องต้องชนกันสนิท
Opening   { id, kind:'door'|'entry'|'window', wallAxis:'x'|'z', at, from, to }   # ช่องบนผนัง อ้างพิกัดจริง
Plot      { id, number, houseTypeId, landSqw, price, status:'available'|'reserved'|'sold', px, py }
Lead / GalleryImage / SiteSettings                      # ตาม schema เดิม
# ทุก object ที่มีข้อความให้คนอ่าน (แบบบ้าน ห้อง ภาพ ส่วนกลาง ทำเล ข้อความโครงการ) มีคู่ `en: {...}` บังคับ
```

## กติกาการทำงาน (ทุก session ของ Claude Code)

1. อ่าน `CLAUDE.md` → `PROJECT.md` → `DESIGN-SPEC.md` → prompt ของ stage ที่ได้รับ
2. **หนึ่ง stage ต่อหนึ่ง session** — จบแล้วผู้ใช้ `/clear` (ประหยัดโควตา: context >150k คือตัวเผาเงิน)
3. ทุก stage จบด้วย: `pnpm check` ผ่าน → `pnpm geometry:check` ผ่าน (ถ้าแตะ geometry) →
   `/impeccable audit` กับหน้าที่แก้ (0 ข้อค้างหรือจดเหตุผล) → ไล่ Slop Ban List §7 → commit → **หยุดรอ verify**
4. รายงานผลเป็นตาราง acceptance ทีละข้อ ผ่าน/ไม่ผ่าน — ห้ามรายงานรวมๆ ว่า "เสร็จแล้ว"
5. **DESIGN-SPEC.md แตะไม่ได้** · ติดปัญหาที่ต้องเลือก → หยุดถาม ห้ามเดา
6. Impeccable: ใช้ `shape` ก่อนขึ้นหน้าใหม่, `typeset`/`polish`/`quieter` เก็บงาน, `audit`+`critique` ก่อนปิด —
   DESIGN.md ของมันต้อง sync จาก DESIGN-SPEC.md เสมอ (ทิศทางเดียว)

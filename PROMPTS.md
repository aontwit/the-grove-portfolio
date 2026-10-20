# PROMPTS.md — ชุด prompt พร้อมใช้ (เดอะ โกรฟ v2)

วิธีใช้: หนึ่ง stage = หนึ่ง session — วาง prompt ทั้งก้อน → รอทำเสร็จ → **verify ตามหัวข้อท้าย stage ด้วยตัวเอง** → `/clear` → stage ถัดไป
ห้ามข้าม verify gate: geometry ผิดใน 2D หาง่ายกว่าใน 3D สิบเท่า (หลักเดียวกับ workflow ของ chatprd)
ทุก prompt สั้นได้เพราะกติกากลางอยู่ใน CLAUDE.md / PROJECT.md / DESIGN-SPEC.md แล้ว

---

## STAGE 0 — Scaffold + Design tokens

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md ให้จบก่อน

ทำ: scaffold โปรเจกต์ตาม PROJECT.md ทั้งโครง — Next.js 15 + TS strict + Tailwind v4 + shadcn init +
Playwright + ESLint/Prettier + สคริปต์ check/geometry:check(ว่างไว้ก่อน) + .nvmrc=24 + engines>=24
ใส่ token ทุกตัวจาก DESIGN-SPEC §1 ลง globals.css (@theme + dark mode ตาม spec)
โหลดฟอนต์ Bai Jamjuree (600,700) และ Anuphan (400,500,600) ผ่าน next/font
สร้างหน้า dev /_style แสดง: swatch สีทุก token (ชื่อ+hex+ตัวอย่างข้อความบนพื้นนั้น), type scale ทุกขนาด,
ปุ่ม 2 แบบ, chip สถานะ 3 แบบ, input — ทั้ง light และ dark

Fixed (ห้ามแตะ): DESIGN-SPEC.md, ห้ามสี/ฟอนต์นอก spec แม้ใน placeholder

Acceptance:
1. pnpm check ผ่าน
2. /_style แสดงครบตามสั่ง ทั้ง 2 โหมด ไม่มีสีนอก token (grep hex นอก globals.css ต้องเป็นศูนย์)
3. ไม่มีฟอนต์ fallback แอบทำงาน (เช็ก network ว่าโหลด Bai Jamjuree/Anuphan จริง)
4. ไม่มี box-shadow ใน CSS (grep ยืนยัน)
รายงาน acceptance ทีละข้อ แล้วหยุด commit: "feat: scaffold + design tokens (S0)"
```

**Verify gate (คุณ):** เปิด /_style บนมือถือ+เดสก์ท็อป — สีตรงตา, ฟอนต์ใช่, dark mode อ่านออกทุกจุด

---

## STAGE 1 — Geometry data + ตัวตรวจ

```
อ่าน CLAUDE.md, PROJECT.md (§Data model, §Single geometry source), DESIGN-SPEC.md

ทำ: สร้าง lib/schemas.ts (zod ทุก entity), lib/repo.ts + repo.mock.ts, lib/store.ts (zustand: selectedRoom,
selectedPlot, planMode '2d'|'3d'|'walk', statusFilter)
สร้าง data/house-types.json: บ้าน "ใบบัว" ชั้นเดียว กรอบ 12.0×8.5 ม. ห้อง 8 ห้อง (นั่งเล่น 5.0×5.5,
ครัว 5.0×3.0, นอนใหญ่ 4.0×4.9, นอน2 4.0×3.6, น้ำในตัว 3.0×1.9, น้ำรวม 3.0×1.9, โถง 3.0×4.7,
ระเบียงนอกกรอบ 4.5×1.65) + openings ทุกประตู/ทางเข้า/หน้าต่าง ระบุพิกัดจริงบนผนัง
+ แบบ "ร่มไม้" และ "ลมเย็น" (ใส่ห้องชั้น 1 พอ) + data/plots.json 18 แปลง (ว่าง10/จอง3/ขาย5, px py บนผัง)
+ gallery.json (ที่ว่างไว้ก่อน — ห้ามรูป placeholder หยาบๆ) + site.json
สร้าง src/geometry/: walls(rooms,openings) คืน segment ผนังพร้อมช่องเปิด, roomArea, houseBounds
สร้าง src/geometry/validate.ts + สคริปต์ pnpm geometry:check ตรวจ: (ก) ห้องในกรอบไม่ซ้อนกัน
(ข) ไม่มีช่องว่างในกรอบบ้าน (ค) ผลรวมพื้นที่ห้องในกรอบ = 12.0×8.5 = 102.0 ตร.ม. เป๊ะ
(ง) ทุก opening อยู่บนผนังจริงและกว้าง 0.8–1.2 ม. (จ) ทุกห้อง (ยกเว้นระเบียง) เดินถึงทางเข้าได้ผ่าน openings

Fixed: DESIGN-SPEC.md · มิติห้องตามที่ระบุ ห้ามปัดแก้เอง — ถ้าตรวจแล้วมีช่องว่าง/ซ้อน ให้รายงานตัวเลขก่อน ห้ามแก้เงียบๆ

Acceptance:
1. pnpm check ผ่าน  2. pnpm geometry:check ผ่านทั้ง 5 ข้อ พิมพ์ผลรายห้อง (ชื่อ กว้าง×ลึก พื้นที่)
3. build แล้ว zod จับ data พังได้จริง (ทดลองใส่ค่าผิด 1 ครั้งแล้วเอาออก)
รายงานตาราง area รายห้อง + acceptance แล้วหยุด commit: "feat: geometry data + validator (S1)"
```

**Verify gate (คุณ):** อ่านตาราง area — ตัวเลขบวกกันได้ 102.0 จริง, openings ครบทุกห้อง

---

## STAGE 2 — แปลนบ้าน 2D (SVG จาก geometry)

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md (§1,3,7) แล้วรัน pnpm geometry:check ให้ผ่านก่อนเริ่ม

ทำ: components/three/FloorPlan2D.tsx — SVG วาดจาก src/geometry เท่านั้น (ห้าม hard-code พิกัด):
ผนังหนาตามจริง เว้นช่อง opening, ห้อง fill โทนจาก token (อ่อนมาก แยกห้องด้วยเส้น ไม่ใช่สีฉูดฉาด),
ชื่อห้อง + พื้นที่ (จาก roomArea ห้ามพิมพ์มือ), dimension line รวมกว้าง/ลึกบ้าน + สเกลบาร์ 1 ม. + ทิศเหนือ
+ ป้าย "หน้าบ้าน/ทางเข้า" · คลิก/แป้นพิมพ์เลือกห้อง → sync store → panel ข้างแสดง ชื่อ/ขนาด/กว้าง×ลึก/desc
หน้า dev /_plan สำหรับดู component นี้เดี่ยวๆ

Fixed: geometry ทั้งหมด (ผนัง ประตู ขนาด — มาจาก data เท่านั้น), DESIGN-SPEC.md
Movable: การเลือกห้อง, hover state

Acceptance:
1. pnpm check ผ่าน
2. ตัวเลขพื้นที่บน SVG ทุกห้อง = ผลจาก geometry:check (แนบตารางเทียบ)
3. จำนวนช่องเปิดบน SVG = จำนวน openings ใน data (นับและรายงาน)
4. คีย์บอร์ดเลือกห้องได้ (Tab + Enter), มือถือแตะได้, ผ่าน impeccable audit
รายงานแล้วหยุด commit: "feat: 2D floor plan from geometry (S2)"
```

**Verify gate (คุณ — ด่านสำคัญที่สุด):** เปิด /_plan เทียบกับตาราง S1 ทีละห้อง ประตูอยู่ถูกตำแหน่ง
ผนังไม่มีรู/ไม่ทับ — **geometry ผิดต้องจบที่นี่ ห้ามปล่อยเข้า 3D**

---

## STAGE 3 — Isometric 3D (extrude จาก geometry เดียวกัน)

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md (§5 ทั้งหมด) · geometry:check ต้องผ่านก่อนเริ่ม

ทำ: components/three/IsoCanvas.tsx (Orthographic isometric + drag หมุน/pinch ซูม/ลูกศร + แสงตาม spec §5
เป๊ะทุกค่า + frameloop demand เมื่อนิ่ง) และ FloorPlanScene.tsx: extrude ผนังจาก walls() —
ผนังหลัง 2 ด้านเต็มสูง 2.6 (ด้าน accent เขียวหม่นด้านเดียว) ด้านหน้า 0.35, ช่องเปิดทุกช่องต้องเป็นรูจริง,
พื้นไม้ ฐาน diorama หนา, ผนังที่หันเข้ากล้อง fade เป็นผนังเตี้ยอัตโนมัติเมื่อหมุน
คลิกห้อง (raycast) sync store เดียวกับ 2D · toggle 2D↔3D crossfade ใน /_plan
ยังไม่ต้องมีเฟอร์นิเจอร์ (S4)

Fixed: geometry, DESIGN-SPEC §5 (แสง/วัสดุ/กล้อง — ค่าตัวเลขตามนั้น ห้ามหรี่เอง), DESIGN-SPEC.md
Movable: มุมกล้อง, การเลือกห้อง

Acceptance:
1. pnpm check ผ่าน  2. จำนวนรูบนผนัง 3D = จำนวน openings (นับจาก scene graph และรายงาน)
3. เลือกห้องใน 2D แล้วสลับ 3D ห้องเดิมถูกเลือกอยู่ (และกลับกัน)
4. 60fps บนจอ DPR2 (รายงานวิธีวัด), ไม่มี console error, reduced-motion ปิดหมุน
รายงานแล้วหยุด commit: "feat: isometric extrusion from shared geometry (S3)"
```

**Verify gate (คุณ):** หมุนดูรอบ — ประตูตรงกับ 2D ทุกบาน, แสงอุ่นเหมือน ref, ไม่มีผนังรั่ว/Z-fighting

---

## STAGE 4 — เฟอร์นิเจอร์ procedural + ชีวิตในบ้าน

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md §5

ทำ: components/three/furniture/ — Sofa, Bed, Wardrobe, Counter, DiningSet, Desk, Toilet, Sink, ShowerTray,
Rug, Plant, FloorLamp, Frame, Tree (primitive + RoundedBox, palette §5, รับ props ตำแหน่ง/ขนาด/สี)
เพิ่ม furniture config ต่อห้องใน data (ไม่ hard-code ใน component) แล้ววางครบทุกห้อง —
ทุกห้องมีของมีชีวิต ≥2 ชิ้น ตาม spec · hover เฟอร์นิเจอร์ = เลือกห้องนั้น
หน้า dev /_three โชว์เฟอร์นิเจอร์ทุกชิ้นเรียงเป็นแคตตาล็อก

Fixed: geometry, ตำแหน่งผนัง/ประตู (เฟอร์นิเจอร์ห้ามจมผนัง/ขวางประตู — เขียน check ง่ายๆ เพิ่มใน
geometry:check: กล่องเฟอร์นิเจอร์ต้องอยู่ในห้องตัวเองและไม่ทับ opening)

Acceptance:
1. pnpm check + geometry:check (รวม furniture check ใหม่) ผ่าน
2. รายงานจำนวนชิ้นต่อห้อง ทุกห้อง ≥ เกณฑ์  3. fps ยังตามเกณฑ์ S3
รายงานแล้วหยุด commit: "feat: procedural furniture layer (S4)"
```

**Verify gate (คุณ):** ดู /_plan 3D — ความรู้สึก "diorama อบอุ่น" ต้องมาแล้ว ถ้ายังแข็ง สั่งเก็บเฉพาะจุด (อย่าไป stage ต่อ)

---

## STAGE 5 — ผังโครงการ (2D → 3D ด้วยแบบแผนเดียวกัน)

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md

ทำ: MasterPlan2D.tsx (SVG จาก plots.json: 18 แปลง 2 แถว ถนนกลาง คลับเฮาส์/สวน, สีสถานะตาม token +
label, filter สถานะ, dimension สเกลรวม) → verify แบบเดียวกับ S2 → MasterPlanScene.tsx (diorama หมู่บ้าน:
บ้านจิ๋วตามแบบ (กลุ่ม primitive ~6-10 ชิ้น/หลัง), แปลงขายแล้วโทนเทา, ต้นไม้ขอบ, แสงชุดเดียวกับ §5)
คลิกแปลง → panel (เลขแปลง แบบบ้าน ที่ดิน ราคา สถานะ ปุ่มลิงก์ /register?plot=) + toggle 2D↔3D + filter sync

Fixed: DESIGN-SPEC.md, ตำแหน่งแปลงจาก data
Acceptance: 1. checks ผ่าน  2. จำนวน/สถานะแปลงบนจอ = data (นับรายสถานะ)  3. filter ทำงานทั้ง 2 มุมมอง
4. impeccable audit ผ่าน
รายงานแล้วหยุด commit: "feat: master plan 2D/3D (S5)"
```

**Verify gate (คุณ):** นับแปลงแต่ละสีตรงกับ data, กดทุก filter, ลองบนมือถือ

---

## STAGE 6 — หน้าเว็บทั้งหมด + copy

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md (§2,3,4,6,7 เข้มสุดที่ stage นี้)
ก่อนเขียนแต่ละหน้า ใช้ /impeccable shape กับโจทย์ของหน้านั้น

ทำ: ทุก route ใน PROJECT.md — หน้าแรก: hero = FloorPlanScene เต็ม viewport หมุนช้าตาม §4 (มือถือ ~70vh
+ poster ระหว่างโหลด) ข้อความ 1 ประโยค + รอง 1 บรรทัด ปุ่ม 2 · ต่อด้วยตัวเลขโครงการ (dimension-line
เป็นกราฟิกข้อมูลจริง), แบบบ้าน 3 ใบ, แถบผังย่อ, CTA · /house-types/[slug] ฝังตัว planner จาก S2-S4 ·
/master-plan จาก S5 · /gallery (โครงรอรูปจริง — ช่องว่างออกแบบแล้ว ไม่ใช่กล่องเทา) · /location (แผนที่
ยังเป็นปุ่มลิงก์ Google Maps + รายการจุดสำคัญ) · /register (ฟอร์ม zod, รับ ?plot=/?type=, บันทึก
localStorage mock, toast) · copy ทุกหน้าตาม §6 — เขียนแบบเจ้าของเล่า ระบุตัวเลขจริงจาก data

Fixed: DESIGN-SPEC.md ทุกมาตรา โดยเฉพาะ §4 motion (ห้าม scroll-reveal) และ §7 slop list
Acceptance:
1. ทุก route เปิดได้ มือถือ 390px ไม่มี horizontal scroll
2. ไล่ slop list §7 ทีละหมวด รายงานเป็น checklist ว่าเช็กแล้ว
3. /impeccable audit + critique ทุกหน้า — แนบสรุปสิ่งที่แก้
4. e2e smoke ปรับให้ครอบทุก route + ฟอร์ม + เลือกห้อง/แปลง แล้วผ่าน
รายงานแล้วหยุด commit: "feat: public pages + voice copy (S6)"
```

**Verify gate (คุณ):** เปิดทุกหน้าบนมือถือจริง ถามตัวเอง 1 คำถาม: "ถ้าเจอเว็บนี้ จะเดาได้ไหมว่า AI ทำ?" — ถ้าเดาได้ ชี้จุดแล้วสั่งแก้ก่อนไปต่อ

---

## STAGE 7 — Admin mock

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md

ทำ: /admin (sidebar: ภาพรวม แปลง แบบบ้าน แกลเลอรี ผู้ลงทะเบียน · login demo ผ่านได้เลย · แบนเนอร์
"โหมดเดโม — ข้อมูลไม่บันทึกจริง") · dashboard สรุป + ผังย่อ live · /admin/plots ตารางแก้สถานะ/ราคา →
เว็บฝั่งลูกค้าเปลี่ยนทันที (state/localStorage) · /admin/leads จากฟอร์ม S6 · gallery/house-types UI ครบใน state
ดีไซน์ admin = ภาษาเดียวกับเว็บ (token เดียวกัน เรียบ แม่น) ไม่ใช่ template dashboard

Fixed: DESIGN-SPEC.md · schema เดิม (แก้ผ่าน store ไม่แตะ data file)
Acceptance: 1. checks + audit ผ่าน  2. แก้สถานะแปลงใน admin → master plan เปลี่ยนสีทันที (e2e ยืนยัน)
3. ฟอร์มหน้าเว็บ → โผล่ใน leads (e2e ยืนยัน)
รายงานแล้วหยุด commit: "feat: admin mock (S7)"
```

---

## STAGE 8 — Walkthrough (first-person)
```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md §5 · geometry:check ต้องผ่านก่อน

ทำ: WalkthroughScene.tsx — สร้างจาก geometry เดิม: ผนังเต็มสูง 2.6 ทุกด้าน + ฝ้า + ช่องเปิดครบ,
เฟอร์นิเจอร์ชุดเดียวกับ S4, Perspective camera สูง 1.6 ม. · เดสก์ท็อป: WASD+เมาส์ (pointer lock) ·
มือถือ: จอยสติ๊กแตะ · collision กับผนังแบบง่าย (เดินทะลุประตูได้ ทะลุผนังไม่ได้) ·
ปุ่มสลับ มุมสูง (isometric เดิม) ↔ เดินดู ใน /house-types/[slug] · แสงชุดเดียวกับ §5 + ไฟในห้องอุ่นเพิ่มได้

Fixed: geometry (ห้ามสร้างผนังชุดใหม่แยก — ต้อง derive จาก walls() เดิม), DESIGN-SPEC §5
Acceptance: 1. เดินผ่านทุกประตูได้ ชนทุกผนัง (รายงานวิธีทดสอบ)  2. fps มือถือรับได้ (รายงานตัวเลข)
3. ออกจากโหมดแล้ว state ห้องที่เลือกไม่พัง
รายงานแล้วหยุด commit: "feat: first-person walkthrough (S8)"
```

---

## STAGE 9 — QA gate + Deploy preview

```
อ่าน CLAUDE.md, PROJECT.md, DESIGN-SPEC.md §7

ทำ: รันทั้งหมด: pnpm check, geometry:check, test:e2e · /impeccable audit + critique รอบสุดท้ายทุกหน้า ·
ไล่ slop list §7 ทั้งเว็บอีกรอบเป็น checklist · Lighthouse mobile ทุกหน้า (เป้า: Perf ≥85, A11y ≥95) ·
screenshot ทุกหน้า (Playwright) ลง docs/screenshots/ · deploy Vercel preview
สิ่งที่พบแต่ไม่แก้ ให้ list พร้อมเหตุผล ห้ามแก้เงียบเกิน scope

Acceptance: รายงานผลทุกเกณฑ์เป็นตาราง + ลิงก์ preview + รายการ known issues
commit: "chore: QA gate + preview deploy (S9)"
```

**Verify gate (คุณ):** เปิด preview บนมือถือจริง ส่งให้เพื่อน 1 คนดูโดยไม่บอกว่า AI ทำ — เก็บ feedback

---

## Phase ถัดไป (ใช้หลัง mock ผ่านลูกค้า — prompt ย่อ ขยายตอนถึงเวลา)

- **B1 DB:** Drizzle+SQLite schema ตรง zod เดิม, migrate+seed จาก data/, repo.db.ts ตาม interface เดิม — UI ห้ามเปลี่ยน
- **B2 Auth:** Auth.js credentials + argon2, middleware กัน /admin, rate limit
- **B3 Mutations:** Server Actions (zod+session ทุกตัว) ผูก admin เดิม + revalidatePath, ลบป้าย DEMO
- **B4 Upload:** sharp 3 ขนาด webp, จำกัดชนิด/ขนาด, จัดการรูป gallery+แบบบ้าน
- **B5 Security gate:** ยิง action ไม่มี session ต้อง 401 (e2e), leads ไม่รั่ว, .env.example ครบ, backup สคริปต์+ทดสอบ restore จริง
- **L1 เนื้อหาจริง:** rebrand จากข้อมูลลูกค้า ผ่านหน้า admin (สอนลูกค้าไปในตัว)
- **L2 SEO/Perf:** metadata, OG จากภาพ diorama, JSON-LD, sitemap, Lighthouse รอบจริง
- **L3 Production:** Docker+Caddy+VPS, GitHub Actions deploy, cron backup, UptimeRobot, คู่มือ 1 หน้า + วิดีโอสอน, เอกสารส่งมอบ


Feedback from dev
- สามารถลากดูพระอาทิตย์เพื่อดูแสงช่วงเช้าจนถึงเย็นได้ คนซื้อบ้านจะได้รู้ว่าแสงจะสาดเข้าตรงไหน
- สามารถวิเคราะห์ประเมินน้ำท่วมได้ว่ารับน้ำได้เท่าไหร่
- สามารถดูชั้น 2-3 ได้ (หากบ้านนั้นมีมากกว่า 1 ชั้น)

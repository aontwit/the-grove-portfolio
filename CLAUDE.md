# Grove Project (v2)

ลำดับการอ่านทุก session: `PROJECT.md` → `DESIGN-SPEC.md` → prompt ของ stage ที่ได้รับจาก `PROMPTS.md`

## กฎเหล็ก

1. ตอบไทยเท่านั้น
2. สี ฟอนต์ radius spacing ทั้งหมดมาจาก token ใน DESIGN-SPEC §1-3 เท่านั้น — hex แปลกปลอม = บั๊ก
3. Geometry (ผนัง ประตู ขนาดห้อง ตำแหน่งแปลง) มาจาก `src/geometry/` + data เท่านั้น
   2D / isometric / walkthrough คือ 3 มุมมองของ geometry เดียวกัน — ห้ามสร้างชุดแยก
4. ทำทีละ stage ตาม PROMPTS.md — จบ stage: `pnpm check` → `pnpm geometry:check` →
   `/impeccable audit` → ไล่ Slop Ban List (DESIGN-SPEC §7) → รายงาน acceptance ทีละข้อ → commit → หยุด
5. TS strict ห้าม `any` · ข้อมูลผ่าน `lib/repo.ts` เท่านั้น · 3D: รูปทรงบ้าน (ผนัง ช่องเปิด หลังคา จั่ว ที่ตั้งบนแปลง)
   สร้างด้วยโค้ดจาก `src/geometry/` + data เท่านั้น (2D / iso / walkthrough ยังเป็น 3 มุมมองของ geometry เดียว ห้ามโมเดลบ้านแยก)
   · อนุญาต (2026-10-02 เจ้าของอนุมัติ) texture/HDRI **CC0 จาก Poly Haven** เท่านั้น: WebP 1k (2k เฉพาะผิวพระเอก) + ชุด 512 มือถือ
   ใน `public/textures/` `public/hdri/` และต้องลงใน `public/textures/CREDITS.md` · งบรวม 3D ≤ ~5 MB เดสก์ท็อป
   · โมเดล GLB ใช้ได้เมื่อสร้างจากสคริปต์ที่อ่าน `src/geometry` / data (commit สคริปต์ไว้ เช่น `scripts/blender/`) · asset อื่นนอกนี้ = ถามก่อน
6. Copy ตาม DESIGN-SPEC §6 — เสียงเจ้าของโครงการ ตัวเลขจริง ห้ามคำโฆษณาลอย
7. ห้ามเพิ่ม dependency นอกรายการ PROJECT.md โดยไม่ถาม
8. ติดทางแยกที่ spec ไม่ครอบ = ถาม ห้ามเดา · commit = conventional commits

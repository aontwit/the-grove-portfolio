/* สร้างภาพ metadata จากของที่โครงการมีอยู่แล้ว — ไม่วาดภาพใหม่ ไม่ใช้ asset ภายนอก
   - src/app/opengraph-image.png (1200×630) จากภาพนิ่งหมู่บ้านของโครงการแรก public/renders/village-<slug>.png
     (ภาพจากฉาก 3D จริง ถ่ายด้วย scripts/render-stills.mjs) วางแบบ contain บนพื้นหมึกเดียวกับภาพ
   - src/app/opengraph-image.alt.txt — ตัวเลขแปลงอ่านจาก data
   - src/app/apple-icon.png (180×180) จาก src/app/icon.svg (สัญลักษณ์ The Grove) แบบเต็มกรอบ (iOS ตัดมุมให้เอง)
   ใช้ sharp ที่มากับ next อยู่แล้ว ไม่เพิ่ม dependency · รัน: node scripts/meta-images.mjs
   รันใหม่ทุกครั้งที่ถ่ายภาพหมู่บ้านใหม่หรือแก้ icon.svg */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

/* sharp เป็น dependency ของ next ไม่ได้อยู่ใน package.json ของโครงการ — resolve ผ่าน next */
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next/package.json")] }));

const OG = { width: 1200, height: 630 };

/* ── Open Graph ───────────────────────────────────────────────────────────── */
/* โครงการแรกที่เป็นข้อมูลจริง (slot น้อยสุด) — ตัวเดียวกับที่ defaultOgImage ใน app/_meta/site.ts ใช้ */
const projects = JSON.parse(readFileSync(path("src/data/projects.json"), "utf8"));
const showcase = projects
  .filter((p) => p.status === "live" && p.plan)
  .sort((a, b) => a.slot - b.slot)[0];
if (!showcase) throw new Error("ไม่มีโครงการ live ที่มีผัง");
const village = sharp(readFileSync(path(`public/renders/village-${showcase.slug}.png`)));
/* สีพื้นของภาพนิ่งคือ ink ที่ฉาก 3D ใช้ — อ่านจากพิกเซลมุมภาพ ขอบที่เติมจึงกลืนกับภาพพอดี */
const { data: corner } = await village
  .clone()
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true });
await village
  .clone()
  .resize({
    ...OG,
    fit: "contain",
    background: { r: corner[0], g: corner[1], b: corner[2], alpha: 1 },
  })
  .flatten({ background: { r: corner[0], g: corner[1], b: corner[2] } })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(path("src/app/opengraph-image.png"));

const plots = JSON.parse(readFileSync(path("src/data/plots.json"), "utf8")).filter(
  (p) => p.projectId === showcase.id,
);
const site = JSON.parse(readFileSync(path("src/data/site.json"), "utf8"));
writeFileSync(
  path("src/app/opengraph-image.alt.txt"),
  /* ข้อความเดียวกับ meta.ogImageAlt ใน src/i18n/th.ts */
  `${showcase.name} ของ ${site.brandName} ${plots.length} แปลงสองฝั่งถนนกลาง จากโมเดล 3D บนผังแปลงตัวอย่าง`,
);

/* ── Apple touch icon ─────────────────────────────────────────────────────── */
const svg = readFileSync(path("src/app/icon.svg"), "utf8").replace(
  /<rect width="32" height="32" rx="6"/,
  '<rect width="32" height="32" rx="0"',
);
await sharp(Buffer.from(svg), { density: (72 * 180) / 32 })
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(path("src/app/apple-icon.png"));

console.log("เขียน opengraph-image.png, opengraph-image.alt.txt, apple-icon.png แล้ว");

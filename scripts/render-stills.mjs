/* ถ่ายภาพนิ่งจากฉาก 3D จริงของแต่ละแบบบ้าน → public/renders
   รันตอน geometry หรือเฟอร์นิเจอร์เปลี่ยน แล้ว commit ภาพที่ได้ (ไม่ได้รันทุก build เพราะต้องมี GPU/เบราว์เซอร์)

   pnpm dev            (อีกหน้าต่าง)
   pnpm render:stills                          ถ่ายทุกภาพใน src/data/renders.json
   pnpm render:stills baibua-iso village       ถ่ายเฉพาะ id ที่ระบุ
   pnpm render:stills --shot baibua:walk:15:1 --out <ไฟล์.png>
   pnpm render:stills --shot baibua:iso:15:1:ink:closed --out <ไฟล์.png>   (บ้านปิดหลังคา)
                                               ถ่ายมุมนอก manifest ไปไว้ที่อื่น (ใช้ตรวจงาน ไม่ลง public)

   ตัวแปร: BASE_URL (ค่าเริ่ม http://localhost:3000) · STILL_GL=gpu|swiftshader (บังคับเส้นทาง)
           STILL_DPR (ค่าเริ่ม 2) · STILL_SETTLE_MS (เวลารอให้เงา/AO เข้าที่ ค่าเริ่ม 5000) */

import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DPR = Number(process.env.STILL_DPR ?? 2);
const SETTLE = Number(process.env.STILL_SETTLE_MS ?? 5000);
/* รายการถ่าย = src/data/renders.json ไฟล์เดียวกับที่หน้าแกลเลอรีอ่าน */
const renders = JSON.parse(readFileSync(new URL("../src/data/renders.json", import.meta.url)));
const SIZE = {
  iso: { width: 960, height: 720 },
  walk: { width: 1280, height: 800 },
  village: { width: 1280, height: 720 },
};

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const adhoc = flag("--shot");
let shots;
if (adhoc) {
  const [slug, view, hour = "15", floor = "1", bg, closed] = adhoc.split(":");
  const out = flag("--out");
  if (!out) throw new Error("--shot ต้องมี --out <ไฟล์.png>");
  shots = [
    {
      id: "adhoc",
      slug,
      view,
      hour: Number(hour),
      floor: Number(floor),
      dark: bg === "ink",
      closed: closed === "closed",
      out,
    },
  ];
} else {
  const only = new Set(argv.filter((a) => !a.startsWith("--")));
  shots = renders.filter((r) => only.size === 0 || only.has(r.id));
}

/* GPU ก่อน (ANGLE/D3D11 บน Windows, ANGLE/GL ที่อื่น) — ภาพคมและเงา/AO ครบกว่า SwiftShader มาก
   ถ้าเปิดไม่ได้หรือได้ renderer ที่เป็น software ค่อยถอยไป SwiftShader */
const GPU_ARGS = [
  process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=gl",
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
];
const SOFT_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

async function rendererOf(browser) {
  const page = await browser.newPage();
  const info = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  await page.close();
  return info;
}

async function launch() {
  const want = process.env.STILL_GL;
  if (want !== "swiftshader") {
    try {
      const browser = await chromium.launch({ args: GPU_ARGS });
      const r = await rendererOf(browser);
      if (r && !/swiftshader|llvmpipe|software/i.test(r)) {
        console.log("GL:", r);
        return browser;
      }
      console.warn("GPU ใช้ไม่ได้ (ได้", r, ") — ถอยไป SwiftShader");
      await browser.close();
    } catch (e) {
      console.warn("เปิดเบราว์เซอร์แบบ GPU ไม่ได้ — ถอยไป SwiftShader", e?.message ?? e);
    }
  }
  const browser = await chromium.launch({ args: SOFT_ARGS });
  console.log("GL:", await rendererOf(browser));
  return browser;
}

const browser = await launch();
try {
  for (const s of shots) {
    const page = await browser.newPage({ viewport: SIZE[s.view], deviceScaleFactor: DPR });
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(
      `${BASE}/render/${s.slug}?view=${s.view}&hour=${s.hour}&floor=${s.floor}${s.dark ? "&bg=ink" : ""}${s.closed ? "&closed=1" : ""}${s.empty ? "&empty=1" : ""}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector('[data-still][data-ready="true"] canvas', { timeout: 120_000 });
    /* ซ่อนทุกอย่างที่ไม่ใช่ภาพ — ป้ายวิธีเดิน ปุ่ม รายการห้อง และ badge ของ dev server ห้ามติดมาในภาพ */
    await page.addStyleTag({
      content: `nextjs-portal{display:none!important}
        [data-still] *:not(canvas):not(:has(canvas)){visibility:hidden!important}`,
    });
    /* เงา, env map, เงาสัมผัส และ AO ต้องการเฟรมแรกๆ ก่อนเข้าที่ — ขยับขนาดหน้าต่าง 1px
       เพื่อปลุก canvas ที่ใช้ frameloop demand ให้วาดใหม่อีกรอบหลังทุกอย่างโหลดครบ */
    await page.waitForTimeout(SETTLE);
    const vp = SIZE[s.view];
    await page.setViewportSize({ width: vp.width, height: vp.height + 1 });
    await page.setViewportSize(vp);
    await page.waitForTimeout(1200);
    const out = s.out ?? `public/renders/${s.id}.png`;
    mkdirSync(dirname(out), { recursive: true });
    await page.locator("canvas").first().screenshot({ path: out });
    const noisy = errors.filter(
      (e) => !/Download the React DevTools|\[HMR\]|\[Fast Refresh\]/.test(e),
    );
    console.log(
      "✓",
      out,
      noisy.length ? `\n  console: ${noisy.slice(0, 5).join("\n  console: ")}` : "",
    );
    await page.close();
  }
} finally {
  await browser.close();
}

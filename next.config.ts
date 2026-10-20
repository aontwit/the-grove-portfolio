import type { NextConfig } from "next";
import houseTypes from "./src/data/house-types.json";
import projects from "./src/data/projects.json";
import { LEGACY_TARGET_SLUG, legacyRedirects } from "./src/lib/legacy";

const dev = process.env.NODE_ENV !== "production";

/* Content-Security-Policy — อนุญาตเฉพาะสิ่งที่เว็บใช้จริง (ตรวจจาก src/ เมื่อ 2026-10-02)
   - script/style 'unsafe-inline': Next ฝัง payload ของ RSC เป็น inline script และ next/font / framer-motion
     ใช้ style inline · ทางที่แน่นกว่าคือ nonce ผ่าน middleware ซึ่งบังคับให้ทุกหน้าเป็น dynamic (เสีย SSG)
   - dev เพิ่ม 'unsafe-eval' (React Refresh) และ ws: (HMR) — production ไม่มีสองตัวนี้
   - img: ภาพนิ่งของโครงการเป็นไฟล์ในเว็บเอง
     · blob: = พรีวิวไฟล์ที่เจ้าของโครงการเลือกในหลังบ้านก่อนอัปโหลด
   - Google Maps / LINE เป็นลิงก์ออกไปเปิดแท็บใหม่ ไม่ได้ฝังในหน้า จึงไม่ต้องเปิดใน CSP
   - frame-ancestors 'none' = ห้ามเว็บอื่นฝังหน้านี้ใน iframe (แทน X-Frame-Options ในเบราว์เซอร์ใหม่) */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* สำหรับเบราว์เซอร์เก่าที่ยังไม่รู้จัก frame-ancestors */
  { key: "X-Frame-Options", value: "DENY" },
  /* เปิดเฉพาะที่ใช้: เต็มจอ (ตัวดูแปลน) และคัดลอกลิงก์แปลง · ที่เหลือปิดหมด */
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
      "fullscreen=(self)",
      "clipboard-write=(self)",
    ].join(", "),
  },
];

/* URL เก่า (สมัยโครงการเดียว /master-plan ฯลฯ และโครงการตัวอย่าง /projects/the-grove/...) → 308 ถาวร
   ไปหน้าเดียวกันของโครงการจริงลำดับแรก — กฎทั้งหมดสร้างที่ src/lib/legacy.ts (middleware ใช้ไฟล์เดียวกัน)
   ?plot= ที่เป็นแปลงของโครงการปลายทางคงไว้ ที่เหลือ middleware ตัดทิ้ง · ทั้งไทยและ /en
   redirect ทำงานก่อน middleware ภาษา — /th/... ถูก middleware ส่งต่อมาที่นี่อีกทอดเอง */
const houseSlugs = houseTypes
  .filter((h) => h.projectId === projects.find((p) => p.slug === LEGACY_TARGET_SLUG)?.id)
  .map((h) => h.slug);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    /* AVIF ก่อน (เล็กกว่า WebP ราว 20%) แล้วค่อย WebP — ภาพนิ่ง PNG ใน public/renders ได้ประโยชน์ที่สุด */
    formats: ["image/avif", "image/webp"],
    /* ภาพตัวอย่างหน้าแกลเลอรี (gallery.json) — เปิดไว้ให้ next/image ย่อจาก Unsplash ได้ */
  },
  async redirects() {
    return legacyRedirects(houseSlugs);
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

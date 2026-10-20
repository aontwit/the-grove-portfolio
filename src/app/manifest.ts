import type { MetadataRoute } from "next";
import { BROWSER_COLOR, siteDescription } from "@/app/_meta/site";
import { repo } from "@/lib/repo";

/* เว็บขายบ้าน ไม่ใช่แอป — display "browser" ไม่ชวนติดตั้ง แต่ให้ชื่อ ไอคอน และสีถูกต้อง
   เวลาผู้ซื้อกด "เพิ่มไปยังหน้าจอหลัก" เก็บไว้เปิดดูแปลนซ้ำ */
export default function manifest(): MetadataRoute.Manifest {
  const name = repo.getSite().brandName;
  return {
    name,
    short_name: name,
    description: siteDescription(),
    lang: "th",
    start_url: "/",
    display: "browser",
    background_color: BROWSER_COLOR.canvas,
    theme_color: BROWSER_COLOR.canvas,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}

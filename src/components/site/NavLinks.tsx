"use client";

import { usePathname } from "next/navigation";
import { Link, useDict, useLocale } from "@/i18n/client";
import { splitLocale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import { PROJECTS_PATH } from "@/lib/routes";
import { cx } from "@/lib/utils";

/* "projects" อ่านคำจาก i18n/projects.ts (พจนานุกรมส่วนหลายโครงการ) ที่เหลืออ่านจาก nav ของพจนานุกรมหลัก */
const NAV = [
  { href: PROJECTS_PATH, key: "projects" },
  { href: "/gallery", key: "gallery" },
  { href: "/register", key: "register" },
] as const;

/* เมนูระดับแบรนด์ 3 รายการ (แบบบ้าน ผัง ทำเล ย้ายไปอยู่ในหน้าโครงการ 2026-10-02)
   แถวเดียวกว้างราว 210px ทั้งไทยและอังกฤษ — จอ 320px เหลือที่ 284px จึงเป็นแถวเดียวเสมอไม่ว่าฟอนต์ไหน */
const LIST = "flex flex-wrap items-center";

/* เมนูหลัก — บอกหน้าปัจจุบันด้วยสีเข้มกับเส้นใต้ (ไม่ใช่สีอย่างเดียว) และ aria-current
   พื้นที่กดสูง 44px ทั้งที่ตาเห็นเป็นตัวหนังสือบรรทัดเดียว (WCAG 2.5.8 / มือถือมือเดียว)

   จำนวนแถวของเมนูต้องไม่ขึ้นกับฟอนต์ — ถ้าแถวเดียวพอดีกับฟอนต์หนึ่งแต่ล้นกับอีกฟอนต์ ทั้งหน้าจะกระโดดตอนฟอนต์จริงมาถึง (CLS)
   ปุ่มสลับภาษาไม่อยู่ในรายการนี้ (อยู่แถวเดียวกับโลโก้บนจอแคบ) จึงไม่กินที่ของเมนู */
export function NavLinks() {
  const { path } = splitLocale(usePathname());
  const lang = useLocale();
  const t = useDict().nav;
  const projectsLabel = getProjectsDictionary(lang).nav;
  return (
    <nav aria-label={t.label}>
      <ul className={cx("text-15 -mx-1.5", LIST)}>
        {NAV.map((item) => {
          const here = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={here ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center px-1.5 font-medium underline-offset-[6px]",
                  here ? "text-ironwood underline decoration-2" : "text-moss hover:text-ironwood",
                )}
              >
                {item.key === "projects" ? projectsLabel : t[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

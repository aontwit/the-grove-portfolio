import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isThaiOnlyPath } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { legacyPlanTarget } from "@/lib/legacy";
import { SESSION_COOKIE } from "@/lib/session";

/* middleware ตัวเดียวของเว็บ ทำสามหน้าที่
   0. ผังโครงการ URL เก่าที่ ?plot= ไม่ใช่แปลงของโครงการปลายทาง (กฎใน next.config.ts ไม่จับ เพราะตัด query ไม่ได้)
      → 308 ไปผังโครงการปลายทางแบบไม่มี ?plot= (lib/legacy.ts)
   1. กัน /admin — ไม่มี session ส่งไปหน้า login พร้อม ?next= · มี session แล้วเปิดหน้า login ส่งเข้าหลังบ้านเลย
   2. ภาษา — middleware ของ next-intl ตาม i18n/routing.ts · หน้าเว็บทั้งหมดอยู่ใต้ app/[lang]
      - /en/... /zh/... ผ่านไปตรงๆ
      - /th/... redirect ถาวรไป URL เดิมที่ไม่มี prefix (ไทยมี URL เดียว ไม่ให้ซ้ำสองที่)
      - ที่เหลือ rewrite ภายในไป /th/... — แถบที่อยู่ยังเป็น /master-plan ตามเดิม
      - หน้าไทยอย่างเดียว (/admin /render และหน้าเครื่องมือ dev) ไม่ถูกแตะ */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const legacy = legacyPlanTarget(pathname);
  if (legacy) {
    const url = req.nextUrl.clone();
    url.pathname = legacy;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return guardAdmin(req);
  if (isThaiOnlyPath(pathname)) return NextResponse.next();

  // /th/... เป็น URL ซ้ำของหน้าไทย — 308 ถาวรแบบเดิม (next-intl ตอบ 307 ชั่วคราว ซึ่งเครื่องมือค้นหาไม่รวม URL ให้)
  if (pathname === "/th" || pathname.startsWith("/th/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  return intl(req);
}

const intl = createMiddleware(routing);

function guardAdmin(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has(SESSION_COOKIE);
  const onLogin = pathname === "/admin/login";

  if (!signedIn && !onLogin) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}

/* ทุก path ยกเว้นที่ขึ้นต้นด้วย _ (ไฟล์ของ Next /_next และ endpoint ของ dev server /__nextjs_…)
   และไฟล์ที่มีนามสกุล (ภาพใน public, sitemap.xml, robots.txt, icon.svg, opengraph-image.png,
   manifest.webmanifest) — ไฟล์พวกนี้ไม่มีภาษา */
export const config = { matcher: ["/((?!_|.*\\.[^/]+$).*)"] };

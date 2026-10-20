"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { HTML_LANG, LOCALES, localePath, splitLocale, type Locale } from "@/i18n/config";
import { cx } from "@/lib/utils";

/* ปุ่มสลับภาษา ไทย · EN · 中文 — ลิงก์ไปหน้าเดียวกันในภาษาอื่น พร้อม query เดิม (?plot= ของผังโครงการ, ?type= ของฟอร์ม)
   - ชื่อสั้นเขียนเป็นภาษานั้นเอง พร้อม lang + hreflang ให้โปรแกรมอ่านจอออกเสียงถูก · ชื่อเต็ม (languageName) เป็น aria-label
     ซึ่งมีคำที่ตาเห็นอยู่ในชื่อเสมอ (WCAG 2.5.3)
   - ภาษาปัจจุบันไม่เป็นลิงก์ (aria-current) บอกด้วยสีเข้ม + เส้นใต้ ไม่ใช่สีอย่างเดียว
   - <a> ธรรมดา ไม่ใช่ next/link: เปลี่ยนภาษาคือเปลี่ยนทั้งเอกสาร (<html lang>, metadata, ฟอนต์จีน) โหลดใหม่ทั้งหน้าตรงไปตรงมากว่า
   - query อ่านจาก useSearchParams ซึ่งทำให้ส่วนนี้ render ฝั่ง client — หน้า static จึงได้ลิงก์ไม่มี query
     ใน HTML ก่อน (fallback ขนาดเท่ากัน ไม่มี layout shift) แล้วเติม query หลัง hydrate
   - สูง 44px เท่าโลโก้และเมนู (WCAG 2.5.8) · สามชื่อสั้นกว้างราว 120px — จอ 320px แถวโลโก้ (~156px) ยังพอ
   - display มาจากผู้เรียก (className) — inline-flex กับ hidden ใน class เดียวกันชนกัน ลำดับใน CSS ตัดสินแทนเรา */

const SHORT: Record<Locale, string> = { th: "ไทย", en: "EN", zh: "中文" };
const GROUP_LABEL: Record<Locale, string> = { th: "ภาษา", en: "Language", zh: "语言" };

const ITEM =
  "text-15 min-h-11 inline-flex items-center px-1.5 font-medium underline-offset-[6px] decoration-1";

function Links({ query, className }: { query: string; className?: string }) {
  const lang = useLocale();
  const { path } = splitLocale(usePathname());
  return (
    <div role="group" aria-label={GROUP_LABEL[lang]} className={cx("items-center", className)}>
      {LOCALES.map((l) => {
        const name = getDictionary(l).languageName;
        return l === lang ? (
          <span
            key={l}
            lang={HTML_LANG[l]}
            aria-label={name}
            aria-current="true"
            className={cx(ITEM, "text-ironwood underline")}
          >
            {SHORT[l]}
          </span>
        ) : (
          <a
            key={l}
            href={`${localePath(l, path)}${query ? `?${query}` : ""}`}
            hrefLang={HTML_LANG[l]}
            lang={HTML_LANG[l]}
            aria-label={name}
            className={cx(ITEM, "text-moss hover:text-ironwood hover:underline")}
          >
            {SHORT[l]}
          </a>
        );
      })}
    </div>
  );
}

function WithQuery({ className }: { className?: string }) {
  return <Links query={useSearchParams().toString()} className={className} />;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Links query="" className={className} />}>
      <WithQuery className={className} />
    </Suspense>
  );
}

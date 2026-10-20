import type { ReactNode } from "react";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/app/_meta/jsonld";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";
import { getDictionary } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { repo } from "@/lib/repo";

/* โครงของทุกหน้าฝั่งผู้ซื้อ: skip link · header · <main> · footer — [lang]/layout.tsx ใช้
   และ app/not-found.tsx ใช้ห่อ URL ที่ไม่ตรง route ไหนเลย คนที่หลงมายังเห็นเมนูและเดินต่อได้ */
export function SiteChrome({ lang, children }: { lang: Locale; children: ReactNode }) {
  const t = getDictionary(lang);
  const site = repo.getSite(lang);
  return (
    <>
      {/* structured data ระดับเว็บ: แบรนด์ (Organization) + เว็บ (สิ่งที่ยังขาดดูที่ _meta/jsonld.tsx) */}
      <JsonLd data={organizationJsonLd(lang)} />
      <JsonLd data={websiteJsonLd(lang)} />
      <LocaleProvider lang={lang}>
        {/* ลิงก์แรกของหน้าสำหรับคนใช้คีย์บอร์ด/โปรแกรมอ่านจอ — ซ่อนจนกว่าจะได้ focus แล้วโผล่มุมซ้ายบน
            (WCAG 2.4.1) · หน้าแรกข้ามฉากโมเดลไปที่โครงการ (SkipLink) */}
        <SkipLink label={t.common.skipToContent} />
        <SmoothScroll />
        <SiteHeader />
        {/* landmark <main> มีที่เดียวต่อหน้า คือตรงนี้ — หน้าใต้ [lang] ห้ามมี <main> ของตัวเองซ้อน
            เป็นเป้าหมายของ skip link ด้วย: tabIndex -1 ให้ focus ย้ายมาที่นี่จริง
            ปุ่ม Tab ถัดไปจึงเริ่มที่เนื้อหา ไม่ย้อนกลับไปที่เมนู */}
        <main id="content" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter site={site} lang={lang} />
      </LocaleProvider>
    </>
  );
}

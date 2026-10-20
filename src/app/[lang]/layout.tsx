import type { Metadata } from "next";
import { HtmlDocument } from "@/app/_meta/document";
import { SITE_URL, defaultOgImage, siteDescription, siteFacts } from "@/app/_meta/site";
import { SiteChrome } from "@/components/site/SiteChrome";
import { getDictionary } from "@/i18n";
import { LOCALES, OG_LOCALE, otherLocales } from "@/i18n/config";
import { langOf, type LangParams } from "@/i18n/server";

/* หน้าเว็บผู้ซื้อทั้งหมดอยู่ใต้ [lang] — ไทย (URL ไม่มี prefix, middleware rewrite มาเป็น /th) อังกฤษ (/en) จีน (/zh)
   generateStaticParams = ทุกภาษา → ทุกหน้าที่เคย static ยัง static ครบทุกชุด
   ค่าอื่นของ [lang] มาไม่ถึงที่นี่ (middleware rewrite ทุก path ที่ไม่ใช่ /en /zh เป็น /th) · langOf กันไว้อีกชั้น */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const f = siteFacts(lang);
  const description = siteDescription(lang);
  const title = getDictionary(lang).meta.siteTitle(f.name, f.units, f.houseTypes);
  return {
    metadataBase: SITE_URL,
    /* absolute: ไม่ให้ template ของ root layout (ไทย) มาต่อท้ายชื่อหน้าแรกซ้ำ */
    title: { absolute: title, template: `%s · ${f.name}` },
    description,
    applicationName: f.name,
    openGraph: {
      type: "website",
      locale: OG_LOCALE[lang],
      alternateLocale: otherLocales(lang).map((l) => OG_LOCALE[l]),
      siteName: f.name,
      title,
      description,
      /* ภาพ OG: ไทยใช้ app/opengraph-image.png (file convention — alt จาก opengraph-image.alt.txt)
         ภาษาอื่นใส่ภาพเดียวกันพร้อมคำบรรยายภาพของภาษานั้น */
      ...(lang !== "th" && { images: [defaultOgImage(lang)] }),
    },
    /* ไม่ใส่ title/description ซ้ำ — X อ่านจาก og:* ของแต่ละหน้าแทน หน้าลูกจึงไม่ต้องตั้ง twitter เอง */
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LangParams;
}) {
  const lang = await langOf(params);
  return (
    <HtmlDocument lang={lang}>
      <SiteChrome lang={lang}>{children}</SiteChrome>
    </HtmlDocument>
  );
}

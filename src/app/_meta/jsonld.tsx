import { getDictionary } from "@/i18n";
import { HTML_LANG, localePath, otherLocales, type Locale } from "@/i18n/config";
import { projectLabel, projectMapUrl } from "@/lib/projects";
import { lowestOpen } from "@/lib/format";
import { houseHref, projectHref } from "@/lib/routes";
import type { HouseType, Project } from "@/lib/schemas";
import { facebookHref, intlPhone, lineHref } from "@/lib/contact";
import { repo } from "@/lib/repo";
import { absolute, siteDescription } from "./site";

/* structured data (schema.org JSON-LD) — ใส่เฉพาะค่าที่ repo มีจริง ช่องที่ไม่มีข้อมูลให้หายไปเลย ห้ามเติมเอง
   ชื่อแบรนด์ เบอร์โทร (และ Facebook LINE OA ถ้ามี) → Organization
   โครงการ (ข้อมูลสมมติของงานพอร์ต): ชื่อ ทำเล พิกัด ช่วงราคา ราคาเริ่มต้นของแต่ละแบบ → RealEstateListing + Offer
   ไม่ใส่: ห้องและขนาดห้อง (แปลนยังเป็นตัวอย่าง), ราคารายแปลง (ยังไม่มี), ชื่อนิติบุคคลผู้พัฒนา, ใบอนุญาตจัดสรร */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // `<` ใน string ปิด </script> ก่อนเวลาได้ — escape ทิ้งทุกตัว
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** @id ของแบรนด์ — WebSite อ้าง publisher มาที่ node นี้ (ไม่ต้องเขียนข้อมูลแบรนด์ซ้ำสองที่) */
const ORG_ID = absolute("/#organization");

/** แบรนด์ผู้ขาย: ชื่อทุกภาษา โทร และบัญชีโซเชียล — ช่องที่ยัง null ไม่ถูกใส่ */
export function organizationJsonLd(lang: Locale) {
  const site = repo.getSite(lang);
  const others = [...new Set(otherLocales(lang).map((l) => repo.getSite(l).brandName))].filter(
    (n) => n !== site.brandName,
  );
  const sameAs = [
    site.facebook && facebookHref(site.facebook),
    site.lineId && lineHref(site.lineId),
  ].filter((v): v is string => Boolean(v));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.brandName,
    ...(others.length > 0 && { alternateName: others }),
    url: absolute(localePath(lang, "/")),
    logo: absolute("/apple-icon.png"),
    telephone: intlPhone(site.contactPhone),
    ...(site.contactEmail && { email: site.contactEmail }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

/** inLanguage = ภาษาของหน้านี้ · url = หน้าแรกของภาษานั้น */
export function websiteJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: repo.getSite(lang).brandName,
    url: absolute(localePath(lang, "/")),
    inLanguage: HTML_LANG[lang],
    description: siteDescription(lang),
    publisher: { "@id": ORG_ID },
  };
}

/** ภาพนิ่งของแบบบ้านจากฉาก 3D จริง (พื้น paper) — undefined ถ้ายังไม่ได้ถ่าย */
export function houseImage(house: HouseType) {
  const shot = repo.listRenders().find((r) => r.id === `${house.slug}-iso`);
  return shot ? `/renders/${shot.id}.png` : undefined;
}

/** house / project = ของภาษานั้น (repo.listHouseTypes(lang, project.id), repo.getProject(slug, lang)) */
export function houseJsonLd(house: HouseType, lang: Locale, project: Project) {
  const url = absolute(localePath(lang, houseHref(project.slug, house.slug)));
  const image = houseImage(house);
  /* ราคาเริ่มต้นของแบบนี้ (เหมือนหน้าเว็บ): แปลงที่ยังเปิดที่ถูกสุด ซึ่งตอนนี้ยังไม่มีราคารายแปลง
     จึงเท่ากับราคาเริ่มต้นที่ผู้พัฒนาประกาศ · แบบที่ขายหมดใช้ราคาประกาศคู่กับ SoldOut */
  const open = lowestOpen(repo.listPlots(project.id), [house], house.id);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: getDictionary(lang).meta.houseListing(house.name, projectLabel(project, lang)),
    description: house.highlight,
    url,
    inLanguage: HTML_LANG[lang],
    ...(image && { image: absolute(image) }),
    mainEntity: {
      "@type": "House",
      name: house.name,
      floorSize: {
        "@type": "QuantitativeValue",
        value: house.areaSqm,
        unitCode: "MTK",
      },
      numberOfBedrooms: house.beds,
      numberOfBathroomsTotal: house.baths,
    },
    /* structured data ถูกเครื่องมือค้นหาอ่านเป็นข้อเท็จจริง — ใส่ Offer เฉพาะโครงการที่ข้อมูลเป็นของจริง
       (status "live" และราคายืนยันแล้ว) · ราคาเริ่มต้นตามประกาศ ไม่ใช่ราคารายแปลง */
    ...(project.status === "live" &&
      !project.pending.prices && {
        offers: {
          "@type": "Offer",
          price: open ?? house.priceFrom,
          priceCurrency: "THB",
          availability:
            house.soldOut || open === null
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          url,
        },
      }),
  };
}

/** หน้าโครงการ — ใส่เฉพาะโครงการ status "live" (ข้อมูลจริง) · pending คืน null ไม่มี structured data
    เพราะเครื่องมือค้นหาอ่าน JSON-LD เป็นข้อเท็จจริง · ทำเลและพิกัดใส่เมื่อยืนยันแล้ว (pending.location = false)
    ช่วงราคา = ราคาต่ำสุด–สูงสุดที่ผู้พัฒนาประกาศ (project.facts) · offerCount = จำนวนบ้านตามประกาศ */
export function projectJsonLd(project: Project, lang: Locale) {
  if (project.status !== "live" || project.name === null) return null;
  const loc = !project.pending.location ? project.location : null;
  const map = !project.pending.mapUrl ? projectMapUrl(project) : null;
  const facts = project.facts;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: project.name,
    url: absolute(localePath(lang, projectHref(project.slug))),
    inLanguage: HTML_LANG[lang],
    ...(project.summary && { description: project.summary }),
    ...(project.heroStill && { image: absolute(project.heroStill) }),
    ...(loc && {
      contentLocation: {
        "@type": "Place",
        name: project.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: loc.district,
          addressRegion: loc.province,
          addressCountry: "TH",
        },
        ...(!loc.approximate && {
          geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng },
        }),
        ...(map && { hasMap: map }),
      },
    }),
    ...(facts &&
      !project.pending.prices && {
        offers: {
          "@type": "AggregateOffer",
          lowPrice: facts.priceLow,
          highPrice: facts.priceHigh,
          priceCurrency: "THB",
          offerCount: facts.units,
          ...(project.salesStatus && {
            availability:
              project.salesStatus === "soldOut"
                ? "https://schema.org/SoldOut"
                : project.salesStatus === "upcoming"
                  ? "https://schema.org/PreOrder"
                  : "https://schema.org/InStock",
          }),
        },
      }),
    provider: { "@id": ORG_ID },
  };
}

import type { Metadata } from "next";
import { pageMetadata } from "@/app/_meta/site";
import { DocSection as Part, DocStatus, InfoList } from "@/components/site/Pending";
import { Page } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { Link } from "@/i18n/client";
import { langOf, type LangParams } from "@/i18n/server";
import { million } from "@/lib/lead";
import { repo } from "@/lib/repo";
import { baht } from "@/lib/utils";

/* เงื่อนไขของตัวเลขและภาพในเว็บ — ทุกข้อชี้กลับไปที่ที่มาของข้อมูลจริงในโปรเจกต์:
   ราคาเริ่มต้นและพื้นที่จากประกาศของผู้พัฒนา (house-types.json), สถานะจาก plots.json,
   ภาพจาก pnpm render:stills, ทำเลจาก projects.json
   สิ่งที่รวมในราคาและข้อมูลเอกสารโครงการมาจาก site.json (null = รอข้อมูลจริง)
   ฉบับภาษาอังกฤษเป็นคำแปลของฉบับร่างภาษาไทย ติดป้ายร่างรอทนายตรวจเหมือนกัน (DocStatus) */

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDictionary(lang).terms;
  const site = repo.getSite(lang);
  return {
    ...pageMetadata({
      lang,
      title: t.metaTitle,
      path: "/terms",
      description: t.metaDescription(site.brandName),
    }),
    /* ฉบับร่างยังไม่ควรขึ้นผลค้นหา — ปล่อยให้ index เมื่อทนายตรวจและประกาศใช้แล้ว */
    ...(site.terms.draft && { robots: { index: false, follow: true } }),
  };
}

export default async function TermsPage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const dict = getDictionary(lang);
  const t = dict.terms;
  const site = repo.getSite(lang);
  const { developer, legal, terms } = site;
  /* ช่วงราคาเริ่มต้นของทุกแบบบ้านตามประกาศของผู้พัฒนา — ยังไม่มีราคารายแปลง */
  const prices = repo.listHouseTypes().map((h) => h.priceFrom);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);

  return (
    <Page title={t.title} width="narrow" lead={t.lead}>
      <DocStatus doc={terms} lang={lang} />

      <Part id="price" title={t.price.title}>
        <p>{t.price.body}</p>
        <p className="tabular-nums">{t.price.range(million(lo), million(hi))}</p>
        <InfoList
          lang={lang}
          rows={[
            { label: t.price.includes, value: terms.priceIncludes },
            {
              label: t.price.commonFee,
              value: legal.commonFeePerSqwMonth,
              display:
                legal.commonFeePerSqwMonth !== null &&
                dict.footer.commonFeeValue(baht(legal.commonFeePerSqwMonth)),
            },
          ]}
        />
      </Part>

      <Part id="status" title={t.status.title}>
        <p>{t.status.updates}</p>
        <p>{t.status.notBooking}</p>
      </Part>

      <Part id="area" title={t.area.title}>
        <p>{t.area.body}</p>
        <p>{t.area.land}</p>
      </Part>

      <Part id="images" title={t.images.title}>
        <p>{t.images.renders}</p>
        <p>{t.images.samples}</p>
      </Part>

      <Part id="location" title={t.location.title}>
        <p>{t.location.body}</p>
      </Part>

      <Part id="documents" title={t.documents.title}>
        <p>{t.documents.body}</p>
        <InfoList
          lang={lang}
          rows={[
            { label: t.documents.developer, value: developer.name },
            { label: t.documents.address, value: developer.address },
            { label: t.documents.licence, value: legal.allocationLicence },
            { label: t.documents.deeds, value: legal.titleDeeds },
          ]}
        />
        <p>
          {t.documents.privacyBefore}
          <Link href="/privacy" className="text-pine font-medium underline underline-offset-4">
            {t.documents.privacyLink}
          </Link>
          {t.documents.privacyAfter}
        </p>
      </Part>

      {site.demo && <p className="text-15 text-moss mt-14 max-w-[65ch]">{t.demo}</p>}
    </Page>
  );
}

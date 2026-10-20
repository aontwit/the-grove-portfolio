import type { Metadata } from "next";
import { pageMetadata } from "@/app/_meta/site";
import { DocSection as Part, DocStatus, InfoList } from "@/components/site/Pending";
import { Page } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { Link } from "@/i18n/client";
import { langOf, type LangParams } from "@/i18n/server";
import { repo } from "@/lib/repo";

/* คำบอกกล่าวตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 สำหรับฟอร์มลงทะเบียน
   รายการข้อมูลที่เก็บต้องตรงกับช่องใน RegisterForm / leadFormSchema เสมอ — เพิ่มช่องในฟอร์มแล้วต้องเพิ่มที่นี่
   (ทั้ง i18n/th.ts และ en.ts: privacy.collected.items)
   ตัวตนผู้ควบคุมข้อมูล DPO ระยะเวลาเก็บ ผู้ประมวลผล มาจาก site.json (null = รอข้อมูลจริง)
   เลขฉบับ (site.privacy.version) ถูกบันทึกลง lead ทุกแถวตอนกดส่ง แก้เนื้อหาเมื่อไรต้องขยับเลขฉบับ
   ฉบับภาษาอังกฤษเป็นคำแปลของฉบับร่างภาษาไทย ติดป้ายร่างรอทนายตรวจเหมือนกัน (DocStatus) */

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDictionary(lang).privacy;
  const site = repo.getSite(lang);
  return {
    ...pageMetadata({
      lang,
      title: t.metaTitle,
      path: "/privacy",
      description: t.metaDescription(site.brandName),
    }),
    /* ฉบับร่างยังไม่ควรขึ้นผลค้นหา — ปล่อยให้ index เมื่อทนายตรวจและประกาศใช้แล้ว */
    ...(site.privacy.draft && { robots: { index: false, follow: true } }),
  };
}

const LIST = "flex list-disc flex-col gap-1.5 pl-6 marker:text-moss";

export default async function PrivacyPage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const t = getDictionary(lang).privacy;
  const site = repo.getSite(lang);
  const { developer, privacy } = site;

  return (
    <Page
      title={
        <>
          {t.title.lead}
          {/* ไทยและจีนไม่เว้นวรรคระหว่างคำ ภาษาอังกฤษเว้น */}
          {lang === "en" ? " " : ""}
          <span className="whitespace-nowrap">{t.title.tail}</span>
        </>
      }
      width="narrow"
      lead={t.lead}
    >
      <DocStatus doc={privacy} lang={lang} />

      <Part id="controller" title={t.controller.title}>
        <p>{t.controller.body(site.brandName)}</p>
        <InfoList
          lang={lang}
          rows={[
            { label: t.controller.company, value: developer.name },
            { label: t.controller.address, value: developer.address },
            { label: t.controller.dpoEmail, value: privacy.dpoEmail },
            { label: t.controller.dpoPhone, value: privacy.dpoPhone },
          ]}
        />
      </Part>

      <Part id="collected" title={t.collected.title}>
        <p>{t.collected.intro}</p>
        <ul className={LIST}>
          {t.collected.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {/* จริงตามโค้ดตอนนี้ (ไม่มี analytics ไม่มีคุกกี้ฝั่งผู้ซื้อ) — เพิ่มเครื่องมือวัดผลเมื่อไรต้องแก้ประโยคนี้ */}
        <p>{t.collected.note}</p>
      </Part>

      <Part id="purpose" title={t.purpose.title}>
        <dl className="flex flex-col gap-5">
          {t.purpose.items.map((item) => (
            <div key={item.what}>
              <dt className="font-medium">{item.what}</dt>
              <dd className="text-moss mt-1">{item.basis}</dd>
            </div>
          ))}
        </dl>
        <p>{t.purpose.note}</p>
      </Part>

      <Part id="retention" title={t.retention.title}>
        <InfoList lang={lang} rows={[{ label: t.retention.row, value: privacy.retention }]} />
        <p>{t.retention.withdraw}</p>
        {site.demo && <p className="text-15 text-moss">{t.retention.demo}</p>}
      </Part>

      <Part id="recipients" title={t.recipients.title}>
        <p>{t.recipients.body}</p>
        <InfoList
          lang={lang}
          rows={[
            { label: t.recipients.processors, value: privacy.processors },
            { label: t.recipients.crossBorder, value: privacy.crossBorder },
          ]}
        />
      </Part>

      <Part id="rights" title={t.rights.title}>
        <ul className={LIST}>
          {t.rights.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t.rights.body}</p>
      </Part>

      <Part id="changes" title={t.changes.title}>
        <p>{t.changes.body}</p>
        <p>
          {t.changes.termsBefore}
          <Link href="/terms" className="text-pine font-medium underline underline-offset-4">
            {t.changes.termsLink}
          </Link>
          {t.changes.termsAfter}
        </p>
      </Part>
    </Page>
  );
}

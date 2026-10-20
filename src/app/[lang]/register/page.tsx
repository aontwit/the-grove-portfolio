import { Suspense } from "react";
import { RegisterForm } from "@/components/site/RegisterForm";
import { Page } from "@/components/site/Shell";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { langOf, type LangParams } from "@/i18n/server";
import { hasContent } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { pageMetadata } from "@/app/_meta/site";

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDictionary(lang).register;
  const name = repo.getSite(lang).brandName;
  const open = repo.listProjects().filter(hasContent).length;
  /* หัวข้อ OG ยาวกว่าชื่อแท็บ ("ลงทะเบียนรับข้อมูล") — ภาพ OG ตั้งต้นใส่ให้ใน pageMetadata */
  return pageMetadata({
    lang,
    title: t.metaTitle,
    ogTitle: t.ogTitle(name),
    path: "/register",
    description: t.metaDescription(open),
  });
}

export default async function RegisterPage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const t = getDictionary(lang).register;
  const plots = repo.listPlots();
  const houseTypes = repo.listHouseTypes(lang);
  const site = repo.getSite(lang);

  return (
    <Page title={t.title} width="narrow" lead={t.lead(site.contactPhone)}>
      {/* ฟอร์มเดียวของทุกโครงการ — ?project=<slug> เลือกโครงการไว้ให้ ?plot= / ?type= บอกโครงการได้เอง
          จองพื้นที่ความสูงไว้ล่วงหน้า ไม่ให้หน้ากระตุกตอนฟอร์ม (client) ขึ้นมาแทน fallback */}
      <div className="mt-8 min-h-[40rem]">
        <Suspense fallback={<p className="text-15 text-moss">{t.preparing}</p>}>
          <RegisterForm
            projects={repo.listProjects(lang)}
            plots={plots}
            houseTypes={houseTypes}
            site={site}
          />
        </Suspense>
      </div>
    </Page>
  );
}

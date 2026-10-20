"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/site/ButtonLink";
import { Page } from "@/components/site/Shell";
import { useDict, useLocale } from "@/i18n/client";
import { getProjectsDictionary } from "@/i18n/projects";
import { PROJECTS_PATH } from "@/lib/routes";

/* หน้า 404 ของเว็บผู้ซื้อ — not-found.tsx ของ Next ไม่ได้รับ params จึงอ่านภาษาจาก LocaleProvider ที่นี่
   ปุ่มแรกพาไปรายการโครงการ (หน้าระดับแบรนด์) — URL เก่าของโครงการเดียวถูก redirect ไปก่อนถึงหน้านี้แล้ว */
export function NotFoundView({ brandName }: { brandName: string }) {
  const t = useDict();
  const lang = useLocale();

  /* metadata ของ not-found เป็นค่าคงที่ภาษาไทย (Next ไม่ส่ง params ให้) — หน้าภาษาอังกฤษแก้ชื่อแท็บเอง
     หน้า 404 ไม่ถูก index อยู่แล้ว ชื่อแท็บมีไว้ให้คนอ่านเท่านั้น */
  useEffect(() => {
    if (lang !== "th") document.title = `${t.meta.notFound} · ${brandName}`;
  }, [lang, t, brandName]);

  return (
    <Page title={t.notFound.title} width="narrow">
      {/* กันหน้าสั้นจน footer ลอยขึ้นมากลางจอ */}
      <div className="mt-8 flex min-h-[40svh] flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <ButtonLink href={PROJECTS_PATH}>
          {getProjectsDictionary(lang).notFound.projects}
        </ButtonLink>
        <ButtonLink href="/" variant="secondary">
          {t.common.backHome}
        </ButtonLink>
      </div>
    </Page>
  );
}

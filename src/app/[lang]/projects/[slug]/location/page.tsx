import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/site/ButtonLink";
import { ProjectContext } from "@/components/site/ProjectContext";
import { Page, Section } from "@/components/site/Shell";
import { TravelTimes } from "@/components/site/TravelTimes";
import { getDictionary } from "@/i18n";
import { projectLabel, projectMapUrl } from "@/lib/projects";
import { locationHref } from "@/lib/routes";
import { projectMetadata, projectOf, projectSlugs, type ProjectParams } from "../../_project";

/* ทำเลของโครงการ — พิกัดตามที่ผู้พัฒนาลงไว้ · วิธีเข้าโครงการและสถานที่ใกล้เคียงเป็นคำของผู้พัฒนา
   ระยะทาง/เวลาเดินทาง (nearby) แสดงเฉพาะเมื่อมีค่าที่ตรวจแล้ว — ห้ามแต่งตัวเลขขึ้นเอง (PRODUCT.md §Evidence on Hand)
   slug ที่ไม่อยู่ในรายการ (รวมโครงการที่ยังรอข้อมูล) = 404 จริง ไม่ใช่หน้า not-found ที่ตอบ 200 ใต้ loading */
export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs({ content: true });
}

export async function generateMetadata({ params }: { params: ProjectParams }): Promise<Metadata> {
  const { lang, project } = await projectOf(params, { content: true });
  const loc = project.location;
  if (!loc) return {};
  const t = getDictionary(lang);
  /* ทำเลยังรอยืนยัน — บอกในคำอธิบายด้วย ไม่ให้ลิงก์ที่ถูกแชร์ดูเป็นตำแหน่งจริง */
  return projectMetadata(project, {
    lang,
    title: `${t.location.title} · ${projectLabel(project, lang)}`,
    path: locationHref(project.slug),
    description: t.location.metaDescription(
      t.meta.place(loc.district, loc.province),
      project.pending.location,
    ),
  });
}

export default async function LocationPage({ params }: { params: ProjectParams }) {
  const { lang, project } = await projectOf(params, { content: true });
  const loc = project.location;
  /* โครงการที่มีข้อมูลแต่ยังไม่มีทำเล — ไม่มีอะไรให้แสดงบนหน้านี้ */
  if (!loc) notFound();
  const t = getDictionary(lang);
  const mapUrl = projectMapUrl(project);

  /* ทำเลยังไม่ยืนยันหรือหมุดเป็นจุดโดยประมาณ — บอกคนอ่านตรงๆ ไม่ปล่อยให้หมุดดูเป็นตำแหน่งจริง */
  const note = [
    project.pending.location && t.location.pendingNote,
    loc.approximate && t.location.approxPin,
  ].filter(Boolean);

  return (
    <Page
      title={t.meta.place(loc.district, loc.province)}
      lead={t.location.lead(projectLabel(project, lang))}
    >
      <ProjectContext project={project} lang={lang} />

      <div className="mt-8 flex flex-col items-start gap-3">
        <p className="text-15">
          <span className="text-moss">{t.location.coords}</span>{" "}
          <span className="font-display font-medium tabular-nums">
            {loc.lat}, {loc.lng}
          </span>
        </p>
        {mapUrl && (
          <ButtonLink href={mapUrl} external>
            {t.location.openMap}
          </ButtonLink>
        )}
        {note.length > 0 && <p className="text-13 text-moss">{note.join(" · ")}</p>}
      </div>

      {loc.directions.length > 0 && (
        <Section title={t.location.directionsTitle} lead={t.location.directionsLead} layout="split">
          <ol className="border-concrete text-17 mt-2 max-w-[60ch] border-t">
            {loc.directions.map((d) => (
              <li key={d.text} className="border-concrete border-b py-3">
                {d.text}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {loc.landmarks.length > 0 && (
        <Section title={t.location.landmarksTitle} lead={t.location.landmarksLead} layout="split">
          <ul className="border-concrete text-17 mt-2 max-w-[60ch] border-t">
            {loc.landmarks.map((m) => (
              <li key={m.name} className="border-concrete border-b py-3">
                {m.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {loc.nearby.length > 0 && (
        <Section title={t.location.sectionTitle} lead={t.location.sectionLead} layout="split">
          <TravelTimes places={loc.nearby} lang={lang} className="max-w-[44rem]" />
        </Section>
      )}
    </Page>
  );
}

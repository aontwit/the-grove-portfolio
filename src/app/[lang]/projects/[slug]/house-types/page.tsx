import type { Metadata } from "next";
import { HouseCard } from "@/components/site/HouseCard";
import { ProjectContext } from "@/components/site/ProjectContext";
import { Page } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { priceNote } from "@/lib/format";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { statusCounts } from "@/lib/status";
import { houseTypesHref } from "@/lib/routes";
import { projectMetadata, projectOf, projectSlugs, type ProjectParams } from "../../_project";

/* slug ที่ไม่อยู่ในรายการ (รวมโครงการที่ยังรอข้อมูลสำหรับหน้าย่อย) = 404 จริง ไม่ใช่หน้า not-found ที่ตอบ 200 ใต้ loading */
export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs({ content: true });
}

export async function generateMetadata({ params }: { params: ProjectParams }): Promise<Metadata> {
  const { lang, project } = await projectOf(params, { content: true });
  const t = getDictionary(lang).houseTypes;
  const houses = repo.listHouseTypes(lang, project.id);
  return projectMetadata(project, {
    lang,
    title: `${t.title} · ${projectLabel(project, lang)}`,
    path: houseTypesHref(project.slug),
    description: t.metaDescription(
      houses.map((h) => t.metaItem(h.name, h.areaSqm)).join(" · "),
      houses.length,
    ),
  });
}

export default async function HouseTypesPage({ params }: { params: ProjectParams }) {
  const { lang, project } = await projectOf(params, { content: true });
  const t = getDictionary(lang).houseTypes;
  const houses = repo.listHouseTypes(lang, project.id);
  const plots = repo.listPlots(project.id);

  return (
    <Page title={t.title} lead={t.lead(houses.length)}>
      <ProjectContext project={project} lang={lang} />
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <HouseCard
            key={house.id}
            house={house}
            plots={plots}
            lang={lang}
            headingLevel="h2"
            projectSlug={project.slug}
          />
        ))}
      </div>

      <p className="text-15 text-moss mt-8">{t.availability(statusCounts(plots), plots.length)}</p>
      <p className="text-13 text-moss mt-2 max-w-[70ch]">
        {priceNote(lang)} · {t.areaNote}
      </p>
    </Page>
  );
}

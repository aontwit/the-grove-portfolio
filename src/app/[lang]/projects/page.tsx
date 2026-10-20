import type { Metadata } from "next";
import { pageMetadata } from "@/app/_meta/site";
import { ProjectsOverview } from "@/components/site/ProjectsOverview";
import { Page } from "@/components/site/Shell";
import { langOf, type LangParams } from "@/i18n/server";
import { getProjectsDictionary } from "@/i18n/projects";
import { hasContent } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { PROJECTS_PATH } from "@/lib/routes";

/* รายการโครงการทั้งหมดของแบรนด์ — โครงการที่รอข้อมูลแสดงด้วย ไม่ซ่อน คนที่ได้ยินว่ามีห้าโครงการจะได้เห็นครบห้า */

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const p = getProjectsDictionary(lang);
  const brand = repo.getSite(lang).brandName;
  return pageMetadata({
    lang,
    title: p.index.title,
    path: PROJECTS_PATH,
    description: p.index.metaDescription(brand, repo.listProjects().length),
  });
}

export default async function ProjectsPage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const p = getProjectsDictionary(lang);
  const projects = repo.listProjects(lang);
  const brand = repo.getSite(lang).brandName;

  return (
    <Page
      title={p.index.title}
      lead={p.index.lead(brand, projects.length, projects.filter(hasContent).length)}
    >
      <ProjectsOverview lang={lang} level="h2" className="mt-10" />
    </Page>
  );
}

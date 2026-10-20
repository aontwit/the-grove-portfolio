import { ProjectTag } from "@/components/site/ProjectTag";
import { Link } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { projectLabel } from "@/lib/projects";
import { projectHref } from "@/lib/routes";
import type { Project } from "@/lib/schemas";

/* บรรทัดใต้ย่อหน้านำของหน้าย่อยในโครงการ (ผัง แบบบ้าน ทำเล) — บอกว่าอยู่โครงการไหน กลับหน้าโครงการได้
   และติดป้ายข้อมูลตัวอย่างทุกหน้าย่อย คนที่เข้ามาจากลิงก์ตรงจะไม่เข้าใจว่าเป็นข้อมูลจริง */
export function ProjectContext({ project, lang }: { project: Project; lang: Locale }) {
  return (
    <p className="text-15 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link
        href={projectHref(project.slug)}
        className="text-pine inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        {projectLabel(project, lang)}
      </Link>
      <ProjectTag project={project} lang={lang} />
    </p>
  );
}

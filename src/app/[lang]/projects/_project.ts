import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/app/_meta/site";
import { langOf } from "@/i18n/server";
import { hasContent, indexable } from "@/lib/projects";
import { repo } from "@/lib/repo";
import type { Project } from "@/lib/schemas";

/* ของกลางของหน้าใต้ /projects/[slug] — ไฟล์ขึ้นต้นด้วย _ Next ไม่นับเป็น route */

export type ProjectParams = Promise<{ lang: string; slug: string }>;

/** ภาษา + โครงการจาก params · slug ที่ไม่มีอยู่จริง = 404
    content: หน้าที่ต้องมีข้อมูล (ผัง แบบบ้าน ทำเล) — โครงการที่ยังรอข้อมูลตอบ 404 เพราะไม่มีอะไรให้แสดง */
export async function projectOf(params: ProjectParams, { content = false } = {}) {
  const lang = await langOf(params);
  const { slug } = await params;
  const project = repo.getProject(slug, lang);
  if (!project || (content && !hasContent(project))) notFound();
  return { lang, project };
}

/** slug ทุกโครงการ (หรือเฉพาะที่มีข้อมูล) — lang มาจาก generateStaticParams ของ [lang]/layout */
export function projectSlugs({ content = false } = {}) {
  return repo
    .listProjects()
    .filter((p) => !content || hasContent(p))
    .map((p) => ({ slug: p.slug }));
}

/** metadata ของหน้าโครงการ = pageMetadata + noindex เมื่อโครงการยังไม่ใช่ข้อมูลจริง
    pending ไม่มีเนื้อหา → noindex · live → index (lib/projects.ts indexable)
    follow ยังเปิด — ลิงก์ในหน้าพาไปหน้าแบรนด์ที่ index ได้ */
export function projectMetadata(
  project: Project,
  args: Parameters<typeof pageMetadata>[0],
): Metadata {
  const meta = pageMetadata(args);
  return indexable(project) ? meta : { ...meta, robots: { index: false, follow: true } };
}

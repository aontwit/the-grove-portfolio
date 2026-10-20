/* URL ของหน้าโครงการทั้งหมดสร้างที่นี่ที่เดียว — path ไม่มี prefix ภาษา (Link / localePath เติม /en เอง)
   ไฟล์นี้ไม่ import data และไม่มี "use client" ใช้ได้ทั้ง server, client และ e2e */

export const PROJECTS_PATH = "/projects";

/** /projects/{slug} · ต่อท้ายด้วย sub เช่น "/master-plan" */
export const projectHref = (projectSlug: string, sub = "") =>
  `${PROJECTS_PATH}/${encodeURIComponent(projectSlug)}${sub}`;

export const masterPlanHref = (projectSlug: string) => projectHref(projectSlug, "/master-plan");

export const houseTypesHref = (projectSlug: string) => projectHref(projectSlug, "/house-types");

export const houseHref = (projectSlug: string, houseSlug: string) =>
  projectHref(projectSlug, `/house-types/${encodeURIComponent(houseSlug)}`);

export const locationHref = (projectSlug: string) => projectHref(projectSlug, "/location");

/** ลิงก์ถาวรของแปลง — หน้าผังโครงการอ่าน ?plot= แล้วเปิดแผงให้เอง (MasterPlanViewer syncUrl)
    generateMetadata ของหน้าผังใช้เป็น canonical ของตัวอย่างลิงก์ที่ทีมขายส่งทาง LINE */
export const plotHref = (projectSlug: string, plotId: string) =>
  `${masterPlanHref(projectSlug)}?plot=${encodeURIComponent(plotId)}`;

/** /register?project=…&plot=…&type=… — ค่าที่ไม่ได้ส่งไม่ใส่ใน URL */
export function registerHref(q: { project?: string; plot?: string; type?: string } = {}) {
  const params = new URLSearchParams();
  if (q.project) params.set("project", q.project);
  if (q.plot) params.set("plot", q.plot);
  if (q.type) params.set("type", q.type);
  const s = params.toString();
  return s ? `/register?${s}` : "/register";
}

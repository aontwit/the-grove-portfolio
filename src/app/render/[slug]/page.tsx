import { notFound } from "next/navigation";
import { repo } from "@/lib/repo";
import { RenderStill } from "./RenderStill";

/* หน้าสำหรับถ่ายภาพนิ่งจากฉาก 3D จริง — scripts/render-stills.mjs เปิดหน้านี้แล้วถ่ายเก็บลง public/renders
   ภาพนิ่งทุกใบในเว็บจึงมาจาก geometry ชุดเดียวกับแปลนและ diorama ไม่ใช่ภาพที่ทำแยก
   ?view=iso|walk|village &hour=6-18 &floor=1|2 &bg=ink &closed=1 (บ้านปิดหลังคา) &empty=1 (แปลงเปล่า) · ใช้ตอน dev เท่านั้น production ไม่มีหน้านี้ */

export const metadata = { robots: { index: false } };

export default async function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    view?: string;
    hour?: string;
    floor?: string;
    bg?: string;
    closed?: string;
    empty?: string;
  }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug } = await params;
  const q = await searchParams;
  const house = repo.getHouseType(slug);
  if (!house) notFound();
  /* หมู่บ้านในภาพนิ่ง = ผังของโครงการที่แบบบ้านนี้อยู่ */
  const plan = repo.getProjectById(house.projectId)?.plan;
  if (!plan) notFound();
  const view = q.view === "walk" || q.view === "village" ? q.view : "iso";
  const hour = Math.min(18, Math.max(6, Number(q.hour ?? 15) || 15));
  const floor = Math.min(house.storeys, Math.max(1, Number(q.floor ?? 1) || 1));
  return (
    <RenderStill
      house={house}
      view={view}
      hour={hour}
      floor={floor}
      dark={q.bg === "ink"}
      closed={q.closed === "1"}
      empty={q.empty === "1"}
      village={{
        plots: repo.listPlots(house.projectId),
        houseTypes: repo.listHouseTypes(undefined, house.projectId),
        plan,
      }}
    />
  );
}

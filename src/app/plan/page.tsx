import { notFound } from "next/navigation";
import { PlanViewer } from "@/components/site/PlanViewer";
import { RoomPanel } from "@/components/site/RoomPanel";
import { Page } from "@/components/site/Shell";
import { repo } from "@/lib/repo";

/* หน้า dev สำหรับดูแปลน 2D และโมเดล Isometric ของ geometry ชุดเดียวกัน
   ไม่ใช่หน้าของผู้ใช้ (หน้าจริงมาใน Stage 6) */

export default function PlanPage() {
  const house = repo.listHouseTypes()[0];
  if (!house) notFound();

  return (
    <Page
      title="แปลน 2D และ 3D"
      lead={`สองมุมมองของ geometry ชุดเดียวกันของแบบบ้าน ${house.name} — ผนัง ประตู และขนาดห้องคำนวณจาก src/geometry ทั้งหมด`}
    >
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PlanViewer house={house} />
        <RoomPanel house={house} />
      </div>
    </Page>
  );
}

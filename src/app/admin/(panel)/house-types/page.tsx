import { AdminHeader } from "@/components/admin/AdminNav";
import { HouseTypeEditor } from "@/components/admin/HouseTypeEditor";
import { repo } from "@/lib/repo";
import { houseHref } from "@/lib/routes";

export const metadata = { title: "แบบบ้าน · หลังบ้าน" };

export default function AdminHouseTypesPage() {
  const houses = repo.listHouseTypes();
  return (
    <>
      <AdminHeader
        title="แบบบ้าน"
        lead={`${houses.length} แบบ · แก้ชื่อ ราคาเริ่มต้น และจุดเด่นได้ บันทึกเมื่อออกจากช่อง ในโหมดเดโมค่าที่แก้ยังไม่ขึ้นบนหน้าเว็บ`}
      />
      <HouseTypeEditor
        houses={houses}
        plots={repo.listPlots()}
        links={Object.fromEntries(
          houses.map((h) => [
            h.id,
            houseHref(repo.getProjectById(h.projectId)?.slug ?? "", h.slug),
          ]),
        )}
      />
    </>
  );
}

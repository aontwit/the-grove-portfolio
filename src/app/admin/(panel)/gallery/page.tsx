import { AdminHeader } from "@/components/admin/AdminNav";
import { GallerySlots } from "@/components/admin/GallerySlots";
import { repo } from "@/lib/repo";

export const metadata = { title: "แกลเลอรี · หลังบ้าน" };

export default function AdminGalleryPage() {
  const site = repo.getSite();
  return (
    <>
      <AdminHeader
        title="แกลเลอรี"
        lead="แต่ละช่องคือภาพที่วางแผนถ่ายไว้ ใต้รูปบอกว่าภาพที่ขึ้นเว็บตอนนี้มาจากไหน · ลองเลือกรูปจริงจากหน้างานใส่ทีละช่องได้ แต่ในโหมดเดโมรูปเห็นแค่ในแท็บนี้ ไม่ได้ส่งไฟล์ออกไปไหน และไม่ขึ้นหน้าเว็บ"
      />
      <GallerySlots shots={site.plannedShots} images={repo.listGallery()} />
    </>
  );
}

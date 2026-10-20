import { LoadingLabel } from "@/components/site/LoadingLabel";
import { ButtonBox, Lines, PageHead, PageSkeleton } from "@/app/[lang]/_skeleton/Skeleton";

/* โครงเดียวกับ page.tsx: หัวเรื่อง → แถวสเปก → เชิงอรรถราคา → แปลน (ซ้าย) + panel ห้อง (ขวา)
   กรอบแปลน 8:7 = สัดส่วนกรอบของ PlanViewer ที่วัดจากหน้าจริง (แบบใบบัว) */
export default function Loading() {
  return (
    <PageSkeleton label={<LoadingLabel id="houseType" />}>
      <PageHead />
      <Lines className="text-17 mt-6 max-w-[36rem]" last="100%" />
      <Lines className="text-13 mt-3 max-w-[70ch]" lines={2} />
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="mb-3 flex gap-2">
            <ButtonBox className="w-24" />
            <ButtonBox className="w-24" />
            <ButtonBox className="w-28" />
          </div>
          <div className="border-concrete rounded-card bg-canvas aspect-[8/7] border" />
          <Lines className="text-13 mt-3" last="45%" />
        </div>
        <div className="border-concrete rounded-card border p-5">
          <Lines className="text-21 w-2/5 leading-[1.2]" last="100%" />
          <Lines className="text-15 mt-2" lines={2} />
        </div>
      </div>
    </PageSkeleton>
  );
}

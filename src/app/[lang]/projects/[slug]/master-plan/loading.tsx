import { LoadingLabel } from "@/components/site/LoadingLabel";
import { ButtonBox, Lines, PageHead, PageSkeleton } from "@/app/[lang]/_skeleton/Skeleton";

/* โครงเดียวกับ page.tsx: หัวเรื่อง → แถวตัวกรอง → ผัง → ตารางแปลง
   สัดส่วนกรอบผังมาจาก viewBox ของ MasterPlan2D (ผัง 180×66 ม. + ขอบ 19×22 ม. = 199×88)
   จอแคบกว่า 640px ผังหมุนเป็นแนวตั้ง (usePortraitPlan) · จอกว้างผังมีความกว้างขั้นต่ำ 900px */
export default function Loading() {
  return (
    <PageSkeleton label={<LoadingLabel id="masterPlan" />}>
      <PageHead />
      <div className="mt-8 mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex gap-2">
          <ButtonBox className="w-20" />
          <ButtonBox className="w-16" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonBox className="w-24" />
          <ButtonBox className="w-20" />
          <ButtonBox className="w-16" />
          <ButtonBox className="w-24" />
        </div>
      </div>
      <div className="border-concrete rounded-card bg-canvas aspect-[88/199] border sm:aspect-[199/88] sm:min-h-[398px]" />
      <Lines className="text-13 mt-3 max-w-[70ch]" last="55%" />
      <div className="mt-10">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-concrete border-b py-2.5">
            <Lines className="text-15" last={i === 0 ? "40%" : "85%"} />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}

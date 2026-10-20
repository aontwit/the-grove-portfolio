import { LoadingLabel } from "@/components/site/LoadingLabel";
import { ButtonBox, Lines, PageHead, PageSkeleton } from "@/app/[lang]/_skeleton/Skeleton";

/* โครงเดียวกับ page.tsx: หัวเรื่อง → Section แบบ split (หัวข้อซ้าย 22rem / รายการเวลาเดินทางขวา) → ปุ่มแผนที่ */
export default function Loading() {
  return (
    <PageSkeleton label={<LoadingLabel id="location" />}>
      <PageHead />
      <section className="pt-20">
        <div className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div>
            <Lines className="text-26 w-3/4 leading-[1.2]" last="100%" />
            <Lines className="text-17 mt-2" last="80%" />
          </div>
          <div className="max-w-[44rem]">
            <div className="flex flex-col gap-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex h-11 items-center">
                  <Lines className="text-15 w-full" last={`${90 - i * 12}%`} />
                </div>
              ))}
            </div>
            <Lines className="text-13 mt-4" last="100%" />
            <Lines className="text-13 mt-1" last="50%" />
            <ButtonBox className="mt-10 w-56" />
          </div>
        </div>
      </section>
    </PageSkeleton>
  );
}

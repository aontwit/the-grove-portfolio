import { LoadingLabel } from "@/components/site/LoadingLabel";
import { Shell } from "@/components/site/Shell";
import { Lines } from "../_skeleton/Skeleton";

/* โครงเดียวกับ GalleryView: หัวเรื่อง คำนำ ที่มาสองแบบ + ภาพปกกรอบโค้ง 4:5 + แถวชิปตัวกรอง → ตารางภาพ masonry
   ช่องภาพใช้สัดส่วนที่พบบ่อยในแกลเลอรี (4:3 ภาพจากโมเดล · ภาพจากผู้พัฒนาหลายสัดส่วน) */
const TILES = ["4/3", "16/9", "4/5", "4/3", "2/1", "4/3", "3/4", "16/9"];

export default function Loading() {
  return (
    <Shell className="pt-12 pb-24 lg:pt-16">
      <div role="status">
        <span className="sr-only">
          <LoadingLabel id="gallery" />
        </span>
        <div aria-hidden="true">
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:grid-rows-[auto_1fr]">
            <div className="lg:col-start-1 lg:row-start-1">
              <Lines className="text-34 lg:text-46 w-48 leading-[1.2]" last="100%" />
              <Lines className="text-17 mt-5 max-w-[56ch]" lines={2} last="40%" />
              <div className="border-concrete mt-10 grid max-w-[44rem] grid-cols-1 border-t md:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="py-5 md:pr-8">
                    <Lines className="text-15 w-1/2" last="100%" />
                    <Lines className="text-15 mt-2" lines={3} last="50%" />
                  </div>
                ))}
              </div>
            </div>
            <div className="@container lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="bg-concrete aspect-[4/5] w-full [border-radius:50cqw_50cqw_12px_12px]" />
            </div>
            <div className="flex flex-wrap gap-2 lg:col-start-1 lg:row-start-2 lg:self-end">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-concrete rounded-control h-11 w-28 border" />
              ))}
            </div>
          </div>
          <div className="mt-12 columns-1 gap-6 md:columns-2 lg:columns-3 xl:columns-4">
            {TILES.map((r, i) => (
              <div key={i} className="mb-8 break-inside-avoid">
                <div className="bg-concrete rounded-card w-full" style={{ aspectRatio: r }} />
                <Lines className="text-15 mt-3 w-2/3" last="100%" />
                <Lines className="text-13 mt-1 w-full" last="80%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

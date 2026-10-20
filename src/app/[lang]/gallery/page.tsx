import type { Metadata } from "next";
import { pageMetadata } from "@/app/_meta/site";
import { GalleryView, type GalleryProjectChip } from "@/components/site/GalleryView";
import { Shell } from "@/components/site/Shell";
import { getGalleryDictionary } from "@/i18n/gallery";
import { langOf, type LangParams } from "@/i18n/server";
import { hasContent, projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { galleryHeroId, listGalleryItems } from "./items";

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  const g = getGalleryDictionary(lang).gallery;
  const items = listGalleryItems(lang);
  const dev = items.filter((i) => i.source === "developer").length;
  return pageMetadata({
    lang,
    title: g.title,
    path: "/gallery",
    description: g.metaDescription(items.length - dev),
  });
}

/** ชื่อสั้นบนชิปตัวกรอง — "เดอะ โกรฟ @ริมสวน" → "@ริมสวน" (ชื่อโครงการที่ไม่มี @ ใช้ชื่อเต็ม) */
const chipLabel = (name: string) => {
  const at = name.indexOf("@");
  return at >= 0 ? name.slice(at) : name;
};

/* แกลเลอรี — ภาพสองแหล่ง ติดป้ายที่มาทุกภาพ
   - ภาพจากผู้พัฒนา (gallery.json): ภาพบรรยากาศของแบรนด์ บ้านในภาพไม่ใช่แบบบ้านของโครงการ
   - ภาพจากโมเดล 3D (renders.json, reel): บ้านและหมู่บ้านของโครงการจริงบนแปลน/ผังตัวอย่าง
   ภาพตัวอย่าง Unsplash และรายการ "มุมที่จะถ่ายจริง" เอาออกแล้ว (2026-10-02) — มีภาพของแบรนด์เองแทน
   ภาพ stock ที่ไม่ใช่ของโครงการไม่ช่วยให้ผู้ซื้อเข้าใจบ้านหลังนี้ */
export default async function GalleryPage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const s = getGalleryDictionary(lang);
  const g = s.gallery;
  const all = listGalleryItems(lang);
  const heroId = galleryHeroId(lang);
  const hero = all.find((i) => i.id === heroId);
  const items = all.filter((i) => i.id !== heroId);
  const dev = all.filter((i) => i.source === "developer").length;

  /* ชิปต่อโครงการจริงที่มีเนื้อหา — นับภาพจริงฝั่ง client */
  const projects: GalleryProjectChip[] = repo
    .listProjects(lang)
    .filter(hasContent)
    .map((p) => ({ id: p.id, label: chipLabel(projectLabel(p, lang)) }));

  return (
    <Shell className="pt-12 pb-24 lg:pt-16">
      <GalleryView
        hero={hero}
        items={items}
        projects={projects}
        intro={
          <>
            <h1 className="text-34 lg:text-46">{g.title}</h1>
            <p className="text-17 text-moss mt-5 max-w-[64ch]">{g.intro}</p>
            <dl className="border-concrete mt-10 grid max-w-[44rem] grid-cols-1 border-t md:grid-cols-2">
              {(
                [
                  ["developer", dev],
                  ["model3d", all.length - dev],
                ] as const
              )
                /* แหล่งที่ไม่มีภาพไม่ต้องแสดง (งานพอร์ต: ไม่มีภาพจากผู้พัฒนา) */
                .filter(([, n]) => n > 0)
                .map(([key, n]) => (
                  <div
                    key={key}
                    className="border-concrete border-b py-5 md:border-b-0 md:pr-8 md:first:border-r md:last:pl-8"
                  >
                    <dt className="text-15 font-medium">
                      {s.source[key]}
                      <span className="font-display text-moss ml-2 tabular-nums">{g.count(n)}</span>
                    </dt>
                    <dd className="text-15 text-moss mt-2">{g.sources[key]}</dd>
                  </div>
                ))}
            </dl>
          </>
        }
      />
    </Shell>
  );
}

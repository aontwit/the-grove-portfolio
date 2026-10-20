import { openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/i18n/config";
import { getGalleryDictionary } from "@/i18n/gallery";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import type { GalleryItem } from "@/components/site/GalleryView";

/* รวมภาพของหน้าแกลเลอรีจาก repo สองแหล่ง — ฝั่ง server เท่านั้น (อ่านขนาดไฟล์ภาพจากดิสก์)
   1. gallery.json (repo.listGallery) — ภาพจากผู้พัฒนา ขนาดจริงอยู่ใน data
   2. renders.json (repo.listRenders, reel: true) — ภาพนิ่งจากโมเดล 3D ของโครงการ
      ภาพชุดนี้ถ่ายใหม่ได้ตลอด (pnpm render:stills) จึงอ่านขนาดจากหัวไฟล์ PNG จริง ไม่ตั้งค่าคงที่ไว้
      ไฟล์ที่ยังไม่มี (กำลังถ่าย) ข้ามไปก่อน ไม่วางช่องรูปแตก
   โครงการของภาพ 3D ได้จาก slug แบบบ้านในภาพ → projectId ของแบบบ้านนั้น */

export type { GalleryItem };

/** ความกว้าง/สูงจากหัวไฟล์ PNG (IHDR อยู่ที่ไบต์ 16-23) — ไม่ใช่ PNG หรือไม่มีไฟล์ = null */
function pngSize(publicPath: string): { width: number; height: number } | null {
  let fd: number | undefined;
  try {
    fd = openSync(join(process.cwd(), "public", publicPath), "r");
    const head = Buffer.alloc(24);
    if (readSync(fd, head, 0, 24, 0) < 24) return null;
    if (head.readUInt32BE(0) !== 0x89504e47) return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function listGalleryItems(lang: Locale): GalleryItem[] {
  const s = getGalleryDictionary(lang).source;

  const developer: GalleryItem[] = repo.listGallery(lang).map((g) => {
    const project = g.projectId ? repo.getProjectById(g.projectId, lang) : undefined;
    return {
      id: g.id,
      src: g.src,
      width: g.width,
      height: g.height,
      alt: g.alt,
      title: g.title,
      caption: g.caption,
      source: g.source,
      sourceLabel: g.source === "developer" ? s.developer : s.model3d,
      projectId: g.projectId,
      projectName: project ? projectLabel(project, lang) : null,
    };
  });

  const houses = repo.listHouseTypes(lang);
  const model: GalleryItem[] = repo
    .listRenders(lang)
    .filter((r) => r.reel)
    .flatMap((r) => {
      const src = `/renders/${r.id}.png`;
      const size = pngSize(src);
      if (!size) return [];
      const house = houses.find((h) => h.slug === r.slug);
      const project = house ? repo.getProjectById(house.projectId, lang) : undefined;
      const sample =
        r.view === "village"
          ? project?.pending.plots && s.sampleSite
          : house?.samplePlan && s.samplePlan;
      return [
        {
          id: r.id,
          src,
          ...size,
          alt: `${r.title} · ${r.note}`,
          title: r.title,
          caption: r.note,
          source: "model3d" as const,
          sourceLabel: sample ? `${s.model3d} · ${sample}` : s.model3d,
          projectId: project?.id ?? null,
          projectName: project ? projectLabel(project, lang) : null,
        },
      ];
    });

  return [...developer, ...model];
}

/** id ของภาพปก (feature gallery-hero) — ไม่มีก็ไม่มีภาพปก */
export function galleryHeroId(lang: Locale): string | undefined {
  return repo.listGallery(lang).find((g) => g.feature === "gallery-hero")?.id;
}

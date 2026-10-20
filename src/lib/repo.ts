import type { Locale } from "@/i18n/config";
import type { GalleryImage, HouseType, Plot, Project, RenderShot, SiteSettings } from "./schemas";
import { mockRepo } from "./repo.mock";

/* UI อ่านข้อมูลผ่านไฟล์นี้เท่านั้น — phase หลังสลับ mock → DB โดยไม่ต้องแก้ UI
   lang (ไม่ใส่ = ไทย) คืนข้อความใน data เป็นภาษานั้น รูปร่าง object เดิม (lib/localize.ts)
   หลังบ้าน เครื่องมือ dev และ geometry เรียกแบบไม่ใส่ lang เสมอ
   projectId (ไม่ใส่ = ทุกโครงการ) กรองแบบบ้าน/แปลงเฉพาะโครงการนั้น */
export type Repo = {
  /** ทุกโครงการ เรียงตาม slot */
  listProjects(lang?: Locale): Project[];
  getProject(slug: string, lang?: Locale): Project | undefined;
  getProjectById(id: string, lang?: Locale): Project | undefined;
  listHouseTypes(lang?: Locale, projectId?: string): HouseType[];
  getHouseType(slug: string, lang?: Locale): HouseType | undefined;
  listPlots(projectId?: string): Plot[];
  getPlot(id: string): Plot | undefined;
  listGallery(lang?: Locale): GalleryImage[];
  listRenders(lang?: Locale): RenderShot[];
  getSite(lang?: Locale): SiteSettings;
};

export const repo: Repo = mockRepo;

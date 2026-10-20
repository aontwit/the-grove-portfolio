import type { Locale } from "./config";
import { en } from "./en";
import { th, type Dictionary } from "./th";
import { zh } from "./zh";

export type { Dictionary } from "./th";
export * from "./config";

/* คำของ UI ทุกภาษา — ไฟล์เล็ก import ตรงๆ ได้ทั้ง server และ client (ไม่ต้องโหลดแบบ async) */
const DICTIONARIES: Record<Locale, Dictionary> = { th, en, zh };

export function getDictionary(lang: Locale): Dictionary {
  return DICTIONARIES[lang];
}

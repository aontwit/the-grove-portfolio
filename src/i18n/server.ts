import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";

/** params ของหน้าใต้ app/[lang] */
export type LangParams = Promise<{ lang: string }>;

/** ภาษาจาก params — ค่าที่ไม่รู้จักตอบ 404 ([lang]/layout ตั้ง dynamicParams = false กันไว้อีกชั้นแล้ว) */
export async function langOf(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

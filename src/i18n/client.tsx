"use client";

import { NextIntlClientProvider } from "next-intl";
import NextLink from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { DEFAULT_LOCALE, localePath, type Locale } from "./config";
import { getDictionary } from "./index";

/* ภาษาของหน้าสำหรับ client component — [lang]/layout ห่อทั้งหน้าไว้ (provider ของ next-intl + context ภาษาของเรา)
   นอก provider (หลังบ้าน, หน้าเครื่องมือ dev, /render) ได้ภาษาไทยเสมอ — useLocale ของ next-intl โยน error
   เมื่อไม่มี provider จึงอ่านภาษาจาก context ของเราที่มีค่าเริ่มต้นแทน
   คำของ UI มาจาก dictionary แบบมี type (getDictionary) ไม่ได้ส่ง messages ผ่าน provider */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={lang} messages={{}} timeZone="Asia/Bangkok">
      <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useDict() {
  return getDictionary(useLocale());
}

/** next/link ที่อยู่ในภาษาของหน้าเสมอ — href ภายในเว็บเขียนแบบไม่มี prefix ("/master-plan")
    แล้วได้ "/en/master-plan" "/zh/master-plan" เอง · ลิงก์ภายนอกและหน้าไทยอย่างเดียว (/admin) ไม่ถูกแตะ
    ใช้ localePath ของเราแทน Link ของ next-intl: รองรับ "/?q" "/#a" และ path ไทยอย่างเดียวที่ next-intl ไม่รู้จัก */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lang = useLocale();
  return <NextLink href={typeof href === "string" ? localePath(lang, href) : href} {...props} />;
}

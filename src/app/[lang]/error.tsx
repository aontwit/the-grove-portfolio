"use client";

import { useEffect } from "react";
import { ButtonLink, buttonClass } from "@/components/site/ButtonLink";
import { Page } from "@/components/site/Shell";
import { useDict } from "@/i18n/client";

type Props = { error: Error & { digest?: string }; reset: () => void };

/* error ใน [lang] อยู่ใต้ layout ของ site จึงยังเห็น header footer และได้ภาษาจาก LocaleProvider
   ไฟล์นี้เป็น client — อ่าน repo ไม่ได้ ข้อความจึงไม่มีตัวเลขจาก data
   app/error.tsx ใช้ตัวนี้ด้วย (นอก provider = ไทย) */
export function ErrorView({ error, reset }: Props) {
  const t = useDict();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page title={t.error.title} lead={t.error.lead} width="narrow">
      {/* กันหน้าสั้นจน footer ลอยขึ้นมากลางจอ */}
      <div className="mt-8 flex min-h-[40svh] flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <button type="button" onClick={reset} className={buttonClass()}>
          {t.error.retry}
        </button>
        <ButtonLink href="/" variant="secondary">
          {t.common.backHome}
        </ButtonLink>
      </div>
    </Page>
  );
}

export default ErrorView;

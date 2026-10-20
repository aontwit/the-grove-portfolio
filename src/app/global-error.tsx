"use client";

import "./globals.css";
import { buttonClass } from "@/components/site/ButtonLink";
import { Page } from "@/components/site/Shell";

/* layout ราก (ฟอนต์ html body) พังไปด้วย ไฟล์นี้จึงต้องวาด html เอง — เก็บให้เรียบที่สุด */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body>
        <main id="content">
          <Page
            title="เว็บโหลดไม่สำเร็จ"
            lead="กดลองอีกครั้ง ถ้ายังไม่ขึ้นให้รีเฟรชหน้า"
            width="narrow"
          >
            <button type="button" onClick={reset} className={buttonClass("primary", "mt-8")}>
              ลองอีกครั้ง
            </button>
          </Page>
        </main>
      </body>
    </html>
  );
}

"use client";

import { HtmlDocument } from "@/app/_meta/document";
import { ErrorView } from "./[lang]/error";

/* error ระดับราก — จับ error ของ layout ชั้นถัดไป ([lang]/layout, หลังบ้าน) ซึ่งเป็นเจ้าของ <html>
   root layout ผ่านเฉยๆ ไฟล์นี้จึงวาดเอกสารเองและห่อ landmark <main> เอง เป็นภาษาไทย */
export default function RootError(props: Parameters<typeof ErrorView>[0]) {
  return (
    <HtmlDocument lang="th">
      <main id="content">
        <ErrorView {...props} />
      </main>
    </HtmlDocument>
  );
}

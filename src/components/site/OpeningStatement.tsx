"use client";

import type { ReactNode } from "react";
import { SpecStrip } from "@/components/site/SpecStrip";
import { Band, Shell } from "@/components/site/Shell";

/* Section ที่รับช่วงต่อจากฉากผ่าแบบ — หน้าที่คือเปลี่ยนสิ่งที่เพิ่งเห็นให้เป็นเรื่องที่ตัดสินใจได้
   §0 บอกว่า UI รอบโมเดลต้อง "เงียบ ไม่แย่งซีน" ความเป็นมืออาชีพของ section นี้
   จึงมาจากสเกลตัวอักษรกับความแม่นยำของตัวเลข ไม่ใช่จากของตกแต่งที่เพิ่มเข้ามา

   ประโยคอยู่ที่ขนาดเดียวทั้งประโยค — ภาษาไทยไม่เว้นวรรคระหว่างคำ การสลับขนาดกลางบรรทัด
   ทำให้สายตาสะดุดหนักกว่าภาษาที่มีช่องว่าง ตัวเลขจึงอยู่ในแถบค่าต่างหาก ไม่ยัดเข้าไปในประโยค
   แถบค่าพาดเต็มความกว้าง อ่านเป็นแถวเดียวจบ ไม่ใช่คอลัมน์แคบๆ ลอยอยู่ข้างประโยค

   ท่อนนี้ซ้อนขึ้นไปในครึ่งล่างที่ว่างของฉากแรก การส่งไม้ต่อจึงเป็นจังหวะเดียว
   ไม่ใช่ฉากจบแล้วเว้นช่องโหว่ยาวก่อนเนื้อหาจะเริ่ม */

export function OpeningStatement({
  headline,
  lead,
  facts,
  actions,
}: {
  headline: ReactNode;
  lead: ReactNode;
  facts: readonly { label: string; value: string }[];
  actions: ReactNode;
}) {
  return (
    /* ต่อจากแถบหมึกของฉากแรกด้วยพื้นเดียวกัน — ไม่มีรอยต่อสว่าง/มืดมาตัดกลางจังหวะ
       และข้อความยังเป็น chalk/ash/citron ตามกฎพื้นเข้มของ §1 */
    <Band tone="ink">
      <Shell>
        {/* อยู่บนแถบหมึกเดียวกับฉากแรก พื้นจึงต่อเนื่องโดยไม่มีรอยต่อ
         แต่ไม่ซ้อนทับตัวฉากแล้ว — ฉากจบด้วยหมู่บ้านเต็มจอ ไม่มีที่ว่างให้ข้อความไปนั่งทับ */}
        <section className="pt-24 pb-16">
          <div>
            <h1 className="text-34 lg:text-46 max-w-[18ch] text-balance">{headline}</h1>
            <p className="text-21 text-ash mt-6 max-w-[42ch]">{lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">{actions}</div>

            {/* สถานะจริงของโครงการ ณ ตอนนี้ — คำถามแรกของคนที่เพิ่งดูบ้านจบคือ "ยังเหลือไหม" */}
            <SpecStrip className="mt-12" items={facts} />
          </div>
        </section>
      </Shell>
    </Band>
  );
}

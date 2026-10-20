"use client";

import { useRef } from "react";
import { useDemo, type ShotImage } from "@/lib/demo";
import type { GalleryImage, PlannedShot } from "@/lib/schemas";
import { buttonClass } from "@/components/site/ButtonLink";
import { TEXT_BUTTON, TextField } from "./fields";

/* แกลเลอรี — ช่องภาพที่วางแผนไว้ใน site.json เป็นตัวตั้ง ใส่รูปจริงทีละช่อง
   รูปเป็น object URL อยู่ได้แค่ในแท็บนี้ (ไม่ส่งไฟล์ออกไปไหน) — ระบบจริงอัปโหลดขึ้นเซิร์ฟเวอร์ */

const RATIO = { "4:3": "aspect-[4/3]", "3:4": "aspect-[3/4]", "16:9": "aspect-video" } as const;

function Slot({
  shot,
  image,
  published,
}: {
  shot: PlannedShot;
  image: ShotImage | undefined;
  /** รูปที่อยู่ใน data แล้ว (ขึ้นเว็บอยู่) — โชว์เมื่อยังไม่ได้เลือกรูปใหม่ทับ */
  published: GalleryImage | undefined;
}) {
  const setShot = useDemo((s) => s.setShot);
  const input = useRef<HTMLInputElement>(null);
  const shown = image ?? published;

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (image) URL.revokeObjectURL(image.src);
    setShot(shot.id, {
      src: URL.createObjectURL(file),
      fileName: file.name,
      alt: image?.alt ?? shot.title,
    });
  };

  const remove = () => {
    if (image) URL.revokeObjectURL(image.src);
    setShot(shot.id, null);
  };

  return (
    /* การ์ดชิ้นเดียว — ภาพชิดขอบบนของการ์ด ไม่มีกรอบในกรอบ (§3 ห้าม card ซ้อน card) */
    <li className="bg-paper border-concrete rounded-card flex flex-col overflow-hidden border">
      <div>
        <div
          className={`${RATIO[shot.ratio]} bg-canvas border-concrete relative max-h-64 w-full overflow-hidden border-b`}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL ภายในแท็บ next/image ใช้ไม่ได้
            <img
              src={shown.src}
              alt={shown.alt}
              /* key = src: เปลี่ยนรูปแล้วจางเข้า 0.25s ทับช่องเดิม (§4 ตอบการกระทำ) */
              key={shown.src}
              className="ease-settle absolute inset-0 h-full w-full object-cover transition-opacity duration-250 starting:opacity-0 motion-reduce:transition-none"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-13 text-moss">ยังไม่มีรูป · สัดส่วน {shot.ratio}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h2 className="text-21">{shot.title}</h2>
          <p className="text-15 text-moss mt-1">{shot.note}</p>
          {published && !image && (
            <p className="text-13 text-moss mt-2">ภาพที่ขึ้นเว็บตอนนี้ · {published.caption}</p>
          )}
          {/* บอกตรงๆ ว่ารูปนี้ไปไม่ถึงหน้าเว็บ — เดโมไม่มีที่อัปโหลด รูปอยู่แค่ในแท็บนี้ */}
          {image && (
            <p className="text-13 text-moss mt-2">
              <span className="text-ironwood font-medium">ตัวอย่างในแท็บนี้</span> ·{" "}
              {image.fileName} · โหมดเดโมไม่ส่งรูปขึ้นเว็บ ปิดแท็บแล้วรูปนี้หายไป
              {published ? " หน้าเว็บยังใช้รูปเดิมอยู่" : ""}
            </p>
          )}
        </div>

        {image && (
          <TextField
            label="คำอธิบายรูป (สำหรับคนที่มองไม่เห็นภาพ)"
            value={image.alt}
            onCommit={(alt) => setShot(shot.id, { ...image, alt })}
            emptyError={`เขียนสั้นๆ ว่ารูปนี้เห็นอะไร เช่น ${shot.title}`}
          />
        )}

        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="mt-auto flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={buttonClass(image || published ? "secondary" : "primary")}
          >
            {image || published ? "เปลี่ยนรูป" : "เลือกรูป"}
          </button>
          {image && (
            <button type="button" onClick={remove} className={TEXT_BUTTON}>
              {published ? "กลับไปใช้รูปเดิม" : "เอารูปออก"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function GallerySlots({ shots, images }: { shots: PlannedShot[]; images: GalleryImage[] }) {
  const filled = useDemo((s) => s.shots);
  const published = (id: string) => images.find((i) => i.id === id);
  const done = shots.filter((s) => s.id in filled || published(s.id)).length;

  return (
    <>
      <p className="text-15 mb-5 tabular-nums">
        ใส่รูปแล้ว {done} จาก {shots.length} ช่อง
      </p>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {shots.map((s) => (
          <Slot key={s.id} shot={s} image={filled[s.id]} published={published(s.id)} />
        ))}
      </ul>
    </>
  );
}

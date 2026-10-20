"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/site/ButtonLink";
import { signIn, signOut } from "@/lib/auth";
import { cx } from "@/lib/utils";
import { FIELD } from "./fields";

/* login เดโม — กรอกไว้ให้แล้ว กดเข้าได้เลย · B2 เปลี่ยน signIn เป็น Auth.js โดยฟอร์มนี้แทบไม่ต้องแก้ */

function Submit({
  idle,
  busy,
  className,
  icon,
  labelClassName,
}: {
  idle: string;
  busy: string;
  className?: string;
  icon?: React.ReactNode;
  labelClassName?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {icon}
      <span className={labelClassName}>{pending ? busy : idle}</span>
    </button>
  );
}

export function LoginForm({ email, next }: { email: string; next: string }) {
  return (
    <form action={signIn} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-2">
        <span className="text-15 font-medium">อีเมล</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={email}
          className={cx(FIELD, "h-12")}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-15 font-medium">รหัสผ่าน</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="demo-grove"
          className={cx(FIELD, "h-12")}
        />
      </label>
      <Submit
        idle="เข้าสู่ระบบ"
        busy="กำลังเข้าสู่ระบบ…"
        className={buttonClass("primary", "mt-2 w-full")}
      />
    </form>
  );
}

/** ปุ่มออกจากระบบ — ลบ cookie จริง แล้วกลับหน้า login */
export function SignOutButton({
  className,
  icon,
  labelClassName,
}: {
  className?: string;
  icon?: React.ReactNode;
  labelClassName?: string;
}) {
  return (
    <form action={signOut}>
      <Submit
        idle="ออกจากระบบ"
        busy="กำลังออก…"
        className={className}
        icon={icon}
        labelClassName={labelClassName}
      />
    </form>
  );
}

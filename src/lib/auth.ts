"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, safeNext } from "./session";

/* login เดโม — ผ่านทุกครั้ง แต่ session เป็น cookie จริง: ไม่ login เข้า /admin ไม่ได้ ออกแล้วเข้าไม่ได้อีก */

export async function signIn(form: FormData) {
  (await cookies()).set(SESSION_COOKIE, "demo", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

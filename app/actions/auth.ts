"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, clearSession } from "@/lib/session";

function safeNextPath(next: string | null): string {
  if (!next) return "/report";
  if (next === "/admin" || next.startsWith("/admin/")) return next;
  if (next === "/report" || next.startsWith("/report/")) return next;
  return "/report";
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const next = safeNextPath(nextRaw || null);

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user?.active) {
    return { error: "ログインできません" };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "ログインIDまたはパスワードが正しくありません" };
  }

  const role = user.role === "ADMIN" ? "ADMIN" : "MEMBER";
  await createSession({ id: user.id, role, name: user.displayName });

  if (role === "ADMIN" && next === "/report") {
    redirect("/admin");
  }
  if (role === "MEMBER" && next.startsWith("/admin")) {
    redirect("/report");
  }
  redirect(next);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

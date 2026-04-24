"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") throw new Error("unauthorized");
  return s;
}

export async function createMemberAction(formData: FormData) {
  await requireAdmin();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const email = String(formData.get("email") ?? "").trim() || null;
  if (!loginId || !displayName || password.length < 8) {
    return;
  }
  const exists = await prisma.user.findUnique({ where: { loginId } });
  if (exists) return;
  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { loginId, displayName, passwordHash, role: "MEMBER", email },
  });
  revalidatePath("/admin/members");
}

export async function setMemberActiveAction(userId: string, active: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/members");
}

export async function toggleMemberActiveFormAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("nextActive") ?? "");
  if (!userId || (next !== "true" && next !== "false")) return;
  await prisma.user.update({ where: { id: userId }, data: { active: next === "true" } });
  revalidatePath("/admin/members");
}

export async function resetMemberPasswordAction(userId: string, formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return;
  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/admin/members");
}

export async function createSiteAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  try {
    await prisma.site.create({ data: { name } });
  } catch {
    return;
  }
  revalidatePath("/admin/sites");
  revalidatePath("/report");
}

export async function deleteSiteAction(siteId: string, _fd?: FormData) {
  void _fd;
  await requireAdmin();
  await prisma.site.delete({ where: { id: siteId } });
  revalidatePath("/admin/sites");
  revalidatePath("/report");
}

export async function createFloorAction(formData: FormData) {
  await requireAdmin();
  const siteId = String(formData.get("siteId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!siteId || !name) return;
  try {
    await prisma.floor.create({ data: { siteId, name } });
  } catch {
    return;
  }
  revalidatePath("/admin/sites");
  revalidatePath("/report");
}

export async function deleteFloorAction(floorId: string, _fd?: FormData) {
  void _fd;
  await requireAdmin();
  await prisma.floor.delete({ where: { id: floorId } });
  revalidatePath("/admin/sites");
  revalidatePath("/report");
}

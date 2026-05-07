"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { todayJstYmd } from "@/lib/jst";
import { checkReportText } from "@/lib/ai";

const schema = z.object({
  siteId: z.string().min(1),
  floorId: z.string().min(1),
  workArea: z.string().max(500),
  workContent: z.string().min(1).max(4000),
  tomorrowWork: z.string().min(1).max(4000),
  nextJobWithin2Days: z.boolean(),
  spareCapacity: z.boolean(),
  insight: z.string().max(4000),
  hasProblem: z.boolean(),
  problemDetail: z.string().max(4000).optional(),
});

export type ReportActionState = { error?: string; success?: boolean; aiHint?: string | null };

export async function submitReport(_: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const session = await getSession();
  if (!session) return { error: "ログインが必要です" };

  const problemDetailRaw = String(formData.get("problemDetail") ?? "").trim();
  const hasProblem = formData.get("hasProblem") === "true";

  const parsed = schema.safeParse({
    siteId: String(formData.get("siteId") ?? ""),
    floorId: String(formData.get("floorId") ?? ""),
    workArea: String(formData.get("workArea") ?? ""),
    workContent: String(formData.get("workContent") ?? ""),
    tomorrowWork: String(formData.get("tomorrowWork") ?? ""),
    nextJobWithin2Days: formData.get("nextJobWithin2Days") === "true",
    spareCapacity: formData.get("spareCapacity") === "true",
    insight: String(formData.get("insight") ?? ""),
    hasProblem,
    problemDetail: problemDetailRaw || undefined,
  });

  if (!parsed.success) {
    return { error: "入力内容を確認してください" };
  }

  if (parsed.data.hasProblem && !parsed.data.problemDetail) {
    return { error: "「問題あり」の場合は内容を入力してください" };
  }

  const floor = await prisma.floor.findFirst({
    where: { id: parsed.data.floorId, siteId: parsed.data.siteId },
    include: { site: { select: { name: true } } },
  });
  if (!floor) return { error: "作業場所（階）が不正です" };

  const reportDate = todayJstYmd();
  let aiFeedback: string | null = null;
  let aiHint: string | null = null;
  try {
    aiFeedback = await checkReportText({
      siteName: floor.site.name,
      floorName: floor.name,
      workArea: parsed.data.workArea,
      workContent: parsed.data.workContent,
      tomorrowWork: parsed.data.tomorrowWork,
      insight: parsed.data.insight,
      problemDetail: parsed.data.hasProblem ? parsed.data.problemDetail ?? null : null,
    });
    if (aiFeedback) aiHint = aiFeedback;
  } catch {
    aiFeedback = null;
  }

  await prisma.report.upsert({
    where: {
      userId_reportDate: { userId: session.id, reportDate },
    },
    create: {
      userId: session.id,
      siteId: parsed.data.siteId,
      floorId: parsed.data.floorId,
      reportDate,
      workArea: parsed.data.workArea,
      workContent: parsed.data.workContent,
      tomorrowWork: parsed.data.tomorrowWork,
      nextJobWithin2Days: parsed.data.nextJobWithin2Days,
      spareCapacity: parsed.data.spareCapacity,
      insight: parsed.data.insight,
      hasProblem: parsed.data.hasProblem,
      problemDetail: parsed.data.hasProblem ? parsed.data.problemDetail ?? null : null,
      aiFeedback,
    },
    update: {
      siteId: parsed.data.siteId,
      floorId: parsed.data.floorId,
      workArea: parsed.data.workArea,
      workContent: parsed.data.workContent,
      tomorrowWork: parsed.data.tomorrowWork,
      nextJobWithin2Days: parsed.data.nextJobWithin2Days,
      spareCapacity: parsed.data.spareCapacity,
      insight: parsed.data.insight,
      hasProblem: parsed.data.hasProblem,
      problemDetail: parsed.data.hasProblem ? parsed.data.problemDetail ?? null : null,
      aiFeedback,
    },
  });

  revalidatePath("/report");
  revalidatePath("/admin");

  if (aiHint) {
    return { success: true, aiHint };
  }
  return { success: true };
}

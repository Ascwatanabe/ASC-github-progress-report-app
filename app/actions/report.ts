"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { todayJstYmd } from "@/lib/jst";
import { checkReportText } from "@/lib/ai";
import { postTeamsMarkdown } from "@/lib/teams";
import { computeTraffic, trafficEmoji, trafficLabel } from "@/lib/traffic";

function truncateForTeams(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

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

export type ReportActionState = {
  error?: string;
  success?: boolean;
  aiHint?: string | null;
  /** 送信完了メッセージ用 */
  siteName?: string;
  reportDate?: string;
  /** Teams / Webhook 通知の結果（画面表示用） */
  teamsNotify?: {
    ok: boolean;
    summary: string;
    httpStatus?: number;
  };
};

function teamsNotifyFromWebhookResult(
  result: Awaited<ReturnType<typeof postTeamsMarkdown>>,
): NonNullable<ReportActionState["teamsNotify"]> {
  if (result.ok) {
    const { status } = result;
    if (status === 202) {
      return {
        ok: true,
        httpStatus: status,
        summary:
          "通知先はリクエストを受理しました（HTTP 202）。この時点では Teams にまだ表示されていないことがあります。Power Automate の場合は「実行履歴」でフロー全体が成功しているか確認してください。",
      };
    }
    return {
      ok: true,
      httpStatus: status,
      summary:
        "通知先サーバーは正常応答しました。Teams で見えない場合は、Incoming Webhook と Power Automate では動きが異なります。Power Automate の場合は実行履歴と「Teams に投稿」ステップを確認してください。",
    };
  }
  return {
    ok: false,
    summary: `Teams / Webhook への通知に失敗しました。${result.error ?? "理由不明"}`.trim(),
  };
}

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

  const traffic = computeTraffic(parsed.data.hasProblem, parsed.data.nextJobWithin2Days);
  const spareLabel = parsed.data.spareCapacity ? "余力あり" : "余力なし";
  const nextJobLabel = parsed.data.nextJobWithin2Days ? "次の仕事あり（2日以内）" : "次の仕事なし（2日以内）";
  const lines: string[] = [
    `【進捗報告・送信通知】${reportDate}`,
    "",
    `${trafficEmoji(traffic)} ${trafficLabel(traffic)}`,
    `報告者: ${session.name}`,
    `現場: ${floor.site.name} ／ ${floor.name}`,
    `${nextJobLabel} ／ ${spareLabel}`,
  ];
  if (parsed.data.workArea.trim()) {
    lines.push(`作業範囲: ${truncateForTeams(parsed.data.workArea, 300)}`);
  }
  lines.push(`作業内容: ${truncateForTeams(parsed.data.workContent, 900)}`);
  lines.push(`明日の作業: ${truncateForTeams(parsed.data.tomorrowWork, 700)}`);
  if (parsed.data.insight.trim()) {
    lines.push(`コメント: ${truncateForTeams(parsed.data.insight, 500)}`);
  }
  if (parsed.data.hasProblem && parsed.data.problemDetail?.trim()) {
    lines.push(`問題の内容: ${truncateForTeams(parsed.data.problemDetail, 500)}`);
  }

  const teamsBody = lines.join("\n");

  let teamsNotify: ReportActionState["teamsNotify"];

  console.log("[report submit → Teams] posting...");
  try {
    const teamsResult = await postTeamsMarkdown(teamsBody);
    teamsNotify = teamsNotifyFromWebhookResult(teamsResult);
    if (teamsResult.ok) {
      console.log(`[report submit → Teams] ok HTTP ${teamsResult.status}`);
    } else {
      console.warn("[report submit → Teams] failed:", teamsResult.error);
    }
  } catch (e) {
    teamsNotify = {
      ok: false,
      summary: `Teams / Webhook の送信中にエラーが発生しました。${e instanceof Error ? e.message : String(e)}`,
    };
    console.warn("[report submit → Teams] error:", e);
  }

  const done = {
    success: true as const,
    siteName: floor.site.name,
    reportDate,
    aiHint: aiHint ?? null,
    teamsNotify,
  };
  return done;
}

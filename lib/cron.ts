import { prisma } from "@/lib/prisma";
import { todayJstYmd } from "@/lib/jst";
import { computeTraffic } from "@/lib/traffic";
import { postTeamsMarkdown } from "@/lib/teams";
import { sendMail } from "@/lib/mail";

function trafficEmoji(t: ReturnType<typeof computeTraffic>) {
  if (t === "red") return "🔴";
  if (t === "yellow") return "🟡";
  return "🔵";
}

/** 20時・7時などから呼び出し: 当日集計を Teams に投稿 */
export async function runTeamsDailySummary(kind: "evening" | "morning") {
  const date = todayJstYmd();
  const reports = await prisma.report.findMany({
    where: { reportDate: date },
    include: { user: true, site: true },
    orderBy: { createdAt: "desc" },
  });

  const lines: string[] = [];
  lines.push(`【進捗集計 ${date} ${kind === "evening" ? "20:00" : "7:00"}】`);
  lines.push("");

  for (const r of reports) {
    const t = computeTraffic(r.hasProblem, r.nextJobWithin2Days);
    const job = r.nextJobWithin2Days ? "次仕事あり" : "次仕事なし";
    const prob = r.hasProblem ? "問題あり" : "問題なし";
    lines.push(
      `${trafficEmoji(t)} ${r.site.name}　${prob}・${job}　${r.user.displayName}`,
    );
  }

  const sites = await prisma.site.findMany({ select: { id: true, name: true } });
  const reported = new Set(reports.map((r) => r.siteId));
  for (const s of sites) {
    if (!reported.has(s.id)) {
      lines.push(`⚪ ${s.name}　未報告`);
    }
  }

  const body = lines.join("\n");
  return postTeamsMarkdown(body);
}

/** 締め時刻後: 未報告メンバーへリマインド + 管理者へ一覧 */
export async function runUnreportedNotifications() {
  const date = todayJstYmd();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", active: true },
  });
  const reportedUserIds = new Set(
    (await prisma.report.findMany({ where: { reportDate: date }, select: { userId: true } })).map(
      (r) => r.userId,
    ),
  );
  const missing = members.filter((m) => !reportedUserIds.has(m.id));
  if (missing.length === 0) return { sent: 0, detail: "no missing" };

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  const lines = missing.map((m) => `・${m.displayName}（${m.loginId}）`).join("\n");

  let sent = 0;
  for (const m of missing) {
    if (m.email) {
      const r = await sendMail({
        to: m.email,
        subject: "【未報告】本日の進捗報告をお願いします",
        text: `${m.displayName}さん\n\n本日（${date}）の進捗報告がまだ届いていません。\n以下のURLからご報告をお願いします。\n${appUrl}/login`,
      });
      if (r.ok) sent++;
    }
  }

  if (adminEmail) {
    await sendMail({
      to: adminEmail,
      subject: `【未報告あり】${date}`,
      text: `以下のメンバーから本日の報告が届いていません:\n\n${lines}\n`,
    });
    sent++;
  }

  return { sent, detail: lines };
}

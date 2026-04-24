import { prisma } from "@/lib/prisma";
import { todayJstYmd, formatJstDateTime } from "@/lib/jst";
import { computeTraffic, trafficEmoji, trafficLabel } from "@/lib/traffic";

function dotClass(t: ReturnType<typeof computeTraffic>) {
  if (t === "red") return "bg-red-500 shadow-red-500/50";
  if (t === "yellow") return "bg-amber-500 shadow-amber-500/50";
  return "bg-blue-500 shadow-blue-500/50";
}

export default async function AdminDashboardPage() {
  const reportDate = todayJstYmd();
  const reports = await prisma.report.findMany({
    where: { reportDate },
    include: { user: true, site: true, floor: true },
    orderBy: { createdAt: "desc" },
  });

  const members = await prisma.user.findMany({
    where: { role: "MEMBER", active: true },
  });
  const reportedIds = new Set(reports.map((r) => r.userId));
  const missingMembers = members.filter((m) => !reportedIds.has(m.id));

  const counts = { red: 0, yellow: 0, blue: 0 };
  for (const r of reports) {
    const t = computeTraffic(r.hasProblem, r.nextJobWithin2Days);
    counts[t]++;
  }

  const spareToday = reports.filter((r) => r.spareCapacity).map((r) => r.user.displayName);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">現場 進捗まとめ</h1>
        <p className="text-slate-500 text-sm">
          集計日（JST）{reportDate} — 最終更新は各報告の送信時刻です。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white p-4 border border-slate-200 text-center">
          <div className="text-3xl font-black text-red-600">{counts.red}</div>
          <div className="text-xs text-slate-500">要対処</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-slate-200 text-center">
          <div className="text-3xl font-black text-amber-500">{counts.yellow}</div>
          <div className="text-xs text-slate-500">要確認</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-slate-200 text-center">
          <div className="text-3xl font-black text-blue-600">{counts.blue}</div>
          <div className="text-xs text-slate-500">順調</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-slate-200 text-center">
          <div className="text-3xl font-black text-slate-400">{missingMembers.length}</div>
          <div className="text-xs text-slate-500">メンバー未報告</div>
        </div>
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <h2 className="text-sm font-bold text-slate-600 px-4 py-3 bg-slate-50 border-b border-slate-200">
          本日の報告一覧
        </h2>
        <ul className="divide-y divide-slate-100">
          {reports.map((r) => {
            const t = computeTraffic(r.hasProblem, r.nextJobWithin2Days);
            return (
              <li key={r.id} className="px-4 py-3 flex gap-3 items-start">
                <span
                  className={`mt-1 w-3 h-3 rounded-full shrink-0 shadow-lg ${dotClass(t)}`}
                  title={trafficLabel(t)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{r.site.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.user.displayName} ／ {r.floor.name}
                    {r.workArea ? ` ／ ${r.workArea}` : ""} ／{" "}
                    {formatJstDateTime(r.createdAt)}
                  </div>
                  <div className="text-xs mt-1 text-slate-600">
                    {trafficEmoji(t)} {trafficLabel(t)} — 次の仕事:
                    {r.nextJobWithin2Days ? "あり" : "なし"} ／ 問題:
                    {r.hasProblem ? `あり${r.problemDetail ? `（${r.problemDetail}）` : ""}` : "なし"}
                    ／ 余力: {r.spareCapacity ? "あり" : "なし"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {reports.length === 0 ? <p className="p-6 text-slate-500 text-sm">まだ報告がありません。</p> : null}
      </section>

      {missingMembers.length > 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
          <h2 className="text-sm font-bold text-slate-600 mb-2">未報告メンバー</h2>
          <ul className="text-sm text-slate-700 list-disc list-inside">
            {missingMembers.map((m) => (
              <li key={m.id}>
                {m.displayName}（{m.loginId}）
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {spareToday.length > 0 ? (
        <section className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <h2 className="text-sm font-bold text-emerald-800 mb-2">💪 余力あり（本日）</h2>
          <div className="flex flex-wrap gap-2">
            {spareToday.map((n) => (
              <span
                key={n}
                className="px-3 py-1 rounded-full bg-white border border-emerald-300 text-emerald-900 text-sm font-semibold"
              >
                {n}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-slate-400">
        Teams 朝夜の集計は Vercel Cron（<code className="bg-slate-100 px-1 rounded">vercel.json</code>）から{" "}
        <code className="bg-slate-100 px-1 rounded">GET /api/cron?task=...</code> が呼ばれます。環境変数{" "}
        <code className="bg-slate-100 px-1 rounded">CRON_SECRET</code> 設定時、自動で Bearer 認証されます。手動実行は
        POST でも可です。
      </p>
    </main>
  );
}

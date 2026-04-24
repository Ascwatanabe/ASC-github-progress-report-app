import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { todayJstYmd } from "@/lib/jst";
import { logoutAction } from "@/app/actions/auth";
import { ReportForm, type SiteOption } from "./ReportForm";

export default async function ReportPage() {
  const session = await getSession();
  if (!session) return null;

  const sitesRaw = await prisma.site.findMany({
    orderBy: { name: "asc" },
    include: { floors: { orderBy: { name: "asc" } } },
  });

  const sites: SiteOption[] = sitesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    floors: s.floors.map((f) => ({ id: f.id, name: f.name })),
  }));

  const reportDate = todayJstYmd();
  const existing = await prisma.report.findUnique({
    where: { userId_reportDate: { userId: session.id, reportDate } },
  });

  const initial = existing
    ? {
        siteId: existing.siteId,
        floorId: existing.floorId,
        workArea: existing.workArea,
        workContent: existing.workContent,
        tomorrowWork: existing.tomorrowWork,
        nextJobWithin2Days: existing.nextJobWithin2Days,
        spareCapacity: existing.spareCapacity,
        insight: existing.insight,
        hasProblem: existing.hasProblem,
        problemDetail: existing.problemDetail ?? "",
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-800">進捗報告フォーム</h1>
          <p className="text-xs text-slate-500">
            {session.name} ／ 報告日（JST）{reportDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.role === "ADMIN" ? (
            <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
              管理画面
            </Link>
          ) : null}
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {sites.length === 0 ? (
          <p className="text-slate-600">現場マスタが未登録です。管理者に依頼してください。</p>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow border border-slate-200">
            <ReportForm sites={sites} initial={initial} />
          </div>
        )}
      </main>
    </div>
  );
}

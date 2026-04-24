import { prisma } from "@/lib/prisma";
import { createFloorAction, createSiteAction, deleteFloorAction, deleteSiteAction } from "@/app/actions/admin";

export default async function AdminSitesPage() {
  const sites = await prisma.site.findMany({
    orderBy: { name: "asc" },
    include: { floors: { orderBy: { name: "asc" } } },
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">現場・階マスタ</h1>
        <p className="text-sm text-slate-500">報告フォームのドロップダウンに反映されます。</p>
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 p-6 space-y-3">
        <h2 className="font-bold text-slate-700">現場を追加</h2>
        <form action={createSiteAction} className="flex gap-2">
          <input
            name="name"
            placeholder="現場名"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded-xl bg-indigo-600 text-white font-semibold px-4 py-2 text-sm">
            追加
          </button>
        </form>
      </section>

      {sites.map((site) => (
        <section key={site.id} className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <h2 className="text-lg font-bold text-slate-800">{site.name}</h2>
            <form action={deleteSiteAction.bind(null, site.id)}>
              <button
                type="submit"
                className="text-xs text-red-600 hover:underline"
                title="関連する報告がある場合は削除できない場合があります"
              >
                現場を削除
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            {site.floors.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-sm text-slate-800"
              >
                <span>{f.name}</span>
                <form action={deleteFloorAction.bind(null, f.id)}>
                  <button type="submit" className="text-slate-400 hover:text-red-600 text-xs px-1">
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form action={createFloorAction} className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="siteId" value={site.id} />
            <input
              name="name"
              placeholder="新しい階（例: 6階）"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm flex-1 min-w-[160px]"
              required
            />
            <button type="submit" className="rounded-lg bg-slate-800 text-white text-sm px-4 py-2">
              階を追加
            </button>
          </form>
        </section>
      ))}

      {sites.length === 0 ? <p className="text-slate-500 text-sm">現場がまだありません。</p> : null}
    </main>
  );
}

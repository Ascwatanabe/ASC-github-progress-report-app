import { prisma } from "@/lib/prisma";
import {
  createMemberAction,
  resetMemberPasswordAction,
  toggleMemberActiveFormAction,
} from "@/app/actions/admin";

export default async function AdminMembersPage() {
  const users = await prisma.user.findMany({ orderBy: { loginId: "asc" } });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">メンバー管理</h1>
        <p className="text-sm text-slate-500">ログインID・パスワード・メール（未報告通知用）</p>
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-700">新規メンバー</h2>
        <form action={createMemberAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="loginId"
            placeholder="ログインID"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            name="displayName"
            placeholder="表示名"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="パスワード（8文字以上）"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="メール（任意・未報告通知）"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-xl bg-indigo-600 text-white font-semibold py-2 hover:bg-indigo-700"
          >
            追加
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-slate-800">
                {u.displayName}{" "}
                <span className="text-xs font-normal text-slate-500">({u.loginId})</span>
              </div>
              <div className="text-xs text-slate-500">
                権限: {u.role} ／ {u.email ?? "メール未登録"} ／{" "}
                {u.active ? <span className="text-emerald-600">有効</span> : <span className="text-red-600">無効</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <form action={toggleMemberActiveFormAction}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="nextActive" value={u.active ? "false" : "true"} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  {u.active ? "無効化" : "有効化"}
                </button>
              </form>
              <form action={resetMemberPasswordAction.bind(null, u.id)} className="flex gap-1 items-center">
                <input
                  name="password"
                  type="password"
                  placeholder="新パスワード"
                  className="rounded border border-slate-300 px-2 py-1 text-xs w-32"
                  required
                />
                <button
                  type="submit"
                  className="text-xs px-2 py-1 rounded bg-slate-800 text-white"
                >
                  更新
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

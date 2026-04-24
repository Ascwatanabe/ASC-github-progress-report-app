import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <nav className="flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/admin" className="hover:text-indigo-300">
            ダッシュボード
          </Link>
          <Link href="/admin/members" className="hover:text-indigo-300">
            メンバー
          </Link>
          <Link href="/admin/sites" className="hover:text-indigo-300">
            現場・階マスタ
          </Link>
          <Link href="/report" className="hover:text-indigo-300">
            自分の報告フォーム
          </Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-slate-300 hover:text-white">
            ログアウト
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

type Props = { searchParams?: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/report");
  }
  const sp = (await searchParams) ?? {};
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">現場進捗報告</h1>
        <p className="text-sm text-slate-500 text-center mb-6">ログインIDとパスワードを入力</p>
        <LoginForm next={next} />
        <p className="text-xs text-slate-400 mt-4 text-center">
          初回は seed の admin / ChangeMeAdmin!（本番前に必ず変更）
        </p>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.error ? (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">{state.error}</div>
      ) : null}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">ログインID</label>
        <input
          name="loginId"
          autoComplete="username"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">パスワード</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <button
        type="submit"
        className="mt-2 rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 transition"
      >
        ログイン
      </button>
    </form>
  );
}

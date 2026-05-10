"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitReport, type ReportActionState } from "@/app/actions/report";

function SubmitReportButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="rounded-xl bg-violet-600 text-white font-bold py-3 hover:bg-violet-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "送信中…" : "報告を送信する"}
    </button>
  );
}

export type SiteOption = {
  id: string;
  name: string;
  floors: { id: string; name: string }[];
};

type Initial = {
  siteId: string;
  floorId: string;
  workArea: string;
  workContent: string;
  tomorrowWork: string;
  nextJobWithin2Days: boolean;
  spareCapacity: boolean;
  insight: string;
  hasProblem: boolean;
  problemDetail: string;
} | null;

export function ReportForm({ sites, initial }: { sites: SiteOption[]; initial: Initial }) {
  const [state, formAction, isPending] = useActionState(submitReport, {} as ReportActionState);
  const [siteId, setSiteId] = useState(initial?.siteId ?? sites[0]?.id ?? "");
  const [hasProblem, setHasProblem] = useState(initial?.hasProblem ?? false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const floors = useMemo(() => sites.find((s) => s.id === siteId)?.floors ?? [], [sites, siteId]);

  useEffect(() => {
    if (!state?.success && !state?.error) return;
    requestAnimationFrame(() => {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [state?.success, state?.error]);

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-busy={isPending}>
      {state?.error || state?.success ? (
        <div ref={bannerRef} className="flex flex-col gap-4 scroll-mt-24">
          {state?.error ? (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">{state.error}</div>
          ) : null}
          {state?.success ? (
            <div
              className="rounded-lg bg-emerald-50 text-emerald-900 text-sm px-3 py-3 border border-emerald-300 shadow-sm"
              role="status"
              aria-live="polite"
            >
              <p className="font-bold text-emerald-950">進捗報告の送信が完了しました。</p>
              {state.siteName ? (
                <p className="mt-1 text-emerald-800">
                  {state.siteName}
                  {state.reportDate ? ` ／ 報告日（JST）${state.reportDate}` : null}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-emerald-700/90">
                送信時刻（JST）{new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
              </p>
              {state.teamsNotify ? (
                <div
                  className={`mt-3 pt-3 border-t space-y-1 text-xs leading-relaxed ${
                    state.teamsNotify.ok
                      ? "border-emerald-200 text-emerald-950"
                      : "border-amber-300 text-amber-950 bg-amber-50/80 rounded-md px-2 py-2 -mx-1"
                  }`}
                >
                  <p className="font-bold">Teams への通知</p>
                  <p>{state.teamsNotify.summary}</p>
                  {state.teamsNotify.httpStatus != null ? (
                    <p className="font-mono text-emerald-800/90">HTTP {state.teamsNotify.httpStatus}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {state?.success && state.aiHint ? (
            <div className="rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2 border border-amber-200 whitespace-pre-wrap">
              <strong className="block mb-1">AIチェック（参考）:</strong>
              <span className="text-amber-950">{state.aiHint}</span>
              <p className="mt-2 text-xs text-amber-800/90">
                日本語の適正と、同現場の設備担当が内容を追えるかの2点を確認しています。提案は参考用です。
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">現場名（リスト）</label>
          <select
            name="siteId"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            required
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">作業場所・階（必須）</label>
          <select
            name="floorId"
            defaultValue={initial?.floorId ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            required
          >
            <option value="">選択してください</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">作業範囲（任意）</label>
        <input
          name="workArea"
          defaultValue={initial?.workArea ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例：北側 通路部分"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          作業内容（AIチェック: 日本語・同現場への伝わりやすさ）
        </label>
        <textarea
          name="workContent"
          defaultValue={initial?.workContent ?? ""}
          maxLength={4000}
          rows={6}
          className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
          required
        />
        <p className="text-xs text-slate-400 text-right mt-0.5">最大 4000 文字</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          明日の作業（AIチェック: 日本語・同現場への伝わりやすさ）
        </label>
        <textarea
          name="tomorrowWork"
          defaultValue={initial?.tomorrowWork ?? ""}
          maxLength={4000}
          rows={4}
          className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          本日の学んだこと、気づき、指摘内容の改善の余地などコメント
        </label>
        <textarea
          name="insight"
          defaultValue={initial?.insight ?? ""}
          maxLength={4000}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="block text-xs font-semibold text-slate-600 mb-2">次の仕事が2日以内に</span>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="nextJobWithin2Days" value="true" defaultChecked={initial?.nextJobWithin2Days ?? true} />
            あり
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="nextJobWithin2Days" value="false" defaultChecked={initial?.nextJobWithin2Days === false} />
            なし
          </label>
        </div>
      </div>

      <div>
        <span className="block text-xs font-semibold text-slate-600 mb-2">現在の余力</span>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="spareCapacity" value="true" defaultChecked={initial?.spareCapacity ?? false} />
            余力あり
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="spareCapacity" value="false" defaultChecked={!(initial?.spareCapacity ?? false)} />
            余力なし
          </label>
        </div>
      </div>

      <div>
        <span className="block text-xs font-semibold text-slate-600 mb-2">問題の有無</span>
        <input type="hidden" name="hasProblem" value={hasProblem ? "true" : "false"} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setHasProblem(false)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${!hasProblem ? "bg-blue-100 border-blue-400 text-blue-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}
          >
            問題なし
          </button>
          <button
            type="button"
            onClick={() => setHasProblem(true)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${hasProblem ? "bg-red-100 border-red-400 text-red-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}
          >
            問題あり
          </button>
        </div>
      </div>

      {hasProblem ? (
        <div>
          <label className="block text-xs font-semibold text-red-700 mb-1">問題の内容</label>
          <textarea
            name="problemDetail"
            defaultValue={initial?.problemDetail ?? ""}
            rows={3}
            className="w-full rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm"
            required={hasProblem}
          />
        </div>
      ) : null}

      <SubmitReportButton pending={isPending} />
      {state?.success ? (
        <p className="text-center text-sm font-semibold text-emerald-800 -mt-2" role="status">
          {state.teamsNotify
            ? state.teamsNotify.ok
              ? "送信完了。Teams の通知結果はページ上部に表示しています。"
              : "送信は完了しましたが、Teams 通知に問題があります。ページ上部を確認してください。"
            : "送信が完了しました（詳細はページ上部の緑の欄）"}
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-center text-sm font-semibold text-red-700 -mt-2" role="alert">
          送信できませんでした。ページ上部のメッセージを確認してください。
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import { submitReport, type ReportActionState } from "@/app/actions/report";

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
  const [state, formAction] = useActionState(submitReport, {} as ReportActionState);
  const [siteId, setSiteId] = useState(initial?.siteId ?? sites[0]?.id ?? "");
  const [hasProblem, setHasProblem] = useState(initial?.hasProblem ?? false);

  const floors = useMemo(() => sites.find((s) => s.id === siteId)?.floors ?? [], [sites, siteId]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">{state.error}</div>
      ) : null}
      {state?.success && state.aiHint ? (
        <div className="rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2 border border-amber-200">
          <strong>AIからの提案:</strong> {state.aiHint}
        </div>
      ) : null}
      {state?.success && !state.aiHint ? (
        <div className="rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2 border border-emerald-200">
          保存しました（{new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}）
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
        <label className="block text-xs font-semibold text-slate-600 mb-1">作業内容（AIチェック）</label>
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
        <label className="block text-xs font-semibold text-slate-600 mb-1">明日の作業（AIチェック）</label>
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

      <button type="submit" className="rounded-xl bg-violet-600 text-white font-bold py-3 hover:bg-violet-700 transition">
        報告を送信する
      </button>
    </form>
  );
}

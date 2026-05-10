import { NextResponse } from "next/server";
import { postTeamsMarkdown } from "@/lib/teams";

function isDevRuntime(): boolean {
  return process.env.NODE_ENV === "development";
}

/** DEV_TOOLS_SECRET があれば Bearer 必須（開発でも共有 PC 向け） */
function authorizeDevTools(request: Request): boolean {
  const secret = process.env.DEV_TOOLS_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET() {
  if (!isDevRuntime()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: "開発環境のみ。TEAMS_WEBHOOK_URL へテスト POST を送ります。",
    method: "POST",
    url: "/api/dev/test-teams",
    bodyOptional: { text: "チャネルに出したいテスト本文（省略時は既定メッセージ）" },
    authorization: process.env.DEV_TOOLS_SECRET
      ? "Authorization: Bearer <DEV_TOOLS_SECRET と同じ値>"
      : "DEV_TOOLS_SECRET 未設定のため認証なし（任意で設定推奨）",
    responseIncludes: ["httpStatus（Webhook の応答コード）", "ok"],
  });
}

export async function POST(request: Request) {
  if (!isDevRuntime()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!authorizeDevTools(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let text =
    "進捗アプリ・開発テスト送信です。\n" +
    `サーバー時刻（UTC）: ${new Date().toISOString()}\n` +
    "この本文がワークフローで参照されているか確認してください。";

  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const raw = (await request.json()) as unknown;
      if (raw && typeof raw === "object" && "text" in raw) {
        const t = (raw as { text?: unknown }).text;
        if (typeof t === "string" && t.trim()) text = t.trim();
      }
    }
  } catch {
    /* ボディなしで既定文を使う */
  }

  const result = await postTeamsMarkdown(text);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      httpStatus: result.status,
      note:
        "Webhook がこのステータスで応答しました。チャネルに表示されない場合はワークフロー側（本文の参照・投稿ステップ）を確認してください。",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      httpStatus: null,
      error: result.error ?? "unknown",
      note: "TEAMS_WEBHOOK_URL が未設定か、Webhook がエラーを返しました。",
    },
    { status: 502 },
  );
}

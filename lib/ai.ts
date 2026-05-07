import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";

/** 報告送信時に AI に渡す現場コンテキスト */
export type ReportAiContext = {
  siteName: string;
  floorName: string;
  workArea: string;
  workContent: string;
  tomorrowWork: string;
  insight: string;
  problemDetail?: string | null;
};

const AiJsonSchema = z.object({
  japanese: z.object({
    level: z.enum(["ok", "advice"]),
    points: z.string(),
  }),
  team_clarity: z.object({
    level: z.enum(["ok", "advice"]),
    points: z.string(),
  }),
});

const SYSTEM_PROMPT = `あなたは日本の建設現場における建築設備・機械設備の日次進捗報告をレビューするアシスタントです。
報告者にはベトナム人・ミャンマー人など、日本語以外を母語とする作業員も含まれます。

次の2観点だけを評価し、次のJSONスキーマに**厳密に従ったJSONオブジェクトのみ**を出力してください（前後に説明文やマークダウンを付けない）。

観点1 "japanese"（日本語の適正）
- 現場の日報として読み手が迷わない日本語か（文法、助詞、語の選択、ビジネス／現場で不自然な直訳調・誤用）。
- 軽微な表記ゆれだけなら ok。明確な誤りや意味が取りにくい文があれば advice。
- level が ok のとき points は必ず空文字 ""。

観点2 "team_clarity"（同現場の建築設備・機械設備の担当への伝わりやすさ）
- 提示された現場名・階・作業範囲を前提に、**別の担当者**が読んで「何を・どこで・どの程度まで行ったか」「明日何をするか」を追えるか。
- 設備名・機器名・系統・フロア／室番号・数量・完了／未完了など、チーム内で共有すべき具体性が著しく欠ける場合は advice。
- 既に十分具体的であれば ok。level が ok のとき points は必ず空文字 ""。

JSON形式（このキー名をそのまま使う）:
{"japanese":{"level":"ok"|"advice","points":"string"},"team_clarity":{"level":"ok"|"advice","points":"string"}}`;

function buildUserPayload(ctx: ReportAiContext): string {
  const problemBlock =
    ctx.problemDetail?.trim() ? `\n問題の内容:\n${ctx.problemDetail.trim()}` : "";
  const insightBlock = ctx.insight.trim() ? `\n気づき・コメント:\n${ctx.insight.trim()}` : "";
  const areaBlock = ctx.workArea.trim() ? ctx.workArea.trim() : "（未記入）";

  return [
    `現場名: ${ctx.siteName}`,
    `階・ゾーン: ${ctx.floorName}`,
    `作業範囲（任意）: ${areaBlock}`,
    "",
    "作業内容:",
    ctx.workContent,
    "",
    "明日の作業:",
    ctx.tomorrowWork,
    insightBlock,
    problemBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

function formatFeedback(parsed: z.infer<typeof AiJsonSchema>): string | null {
  const blocks: string[] = [];
  if (parsed.japanese.level === "advice" && parsed.japanese.points.trim()) {
    blocks.push(`【日本語の適正】${parsed.japanese.points.trim()}`);
  }
  if (parsed.team_clarity.level === "advice" && parsed.team_clarity.points.trim()) {
    blocks.push(`【同現場・建築設備担当への伝わりやすさ】${parsed.team_clarity.points.trim()}`);
  }
  if (blocks.length === 0) return null;
  return blocks.join("\n\n");
}

function parseAiJson(raw: string): string | null {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFence(raw));
  } catch {
    return null;
  }
  const parsed = AiJsonSchema.safeParse(parsedJson);
  if (!parsed.success) return null;
  return formatFeedback(parsed.data);
}

type ReviewBackend = "openai" | "anthropic";

function resolveReviewBackend(): ReviewBackend | null {
  const explicit = process.env.AI_REVIEW_PROVIDER?.toLowerCase().trim();
  if (explicit === "openai") {
    return process.env.OPENAI_API_KEY ? "openai" : null;
  }
  if (explicit === "anthropic" || explicit === "claude") {
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  }
  // 既定: ANTHROPIC_API_KEY があれば Claude 固定（OpenAI キーが併設されていても Anthropic を使う）
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

async function runOpenAi(userPayload: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.25,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPayload },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? null;
}

async function runAnthropic(userPayload: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
  const res = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPayload }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  return block.text.trim();
}

/**
 * ベトナム人・ミャンマー人等を含むチーム向けに、
 * (1) 業務上の日本語として適正か
 * (2) 同現場の建築・機械設備担当が内容を追えるか
 * を JSON で評価し、改善点があれば整形文で返す。
 *
 * - 既定: ANTHROPIC_API_KEY があれば Claude（OpenAI キーがあっても Claude 優先）
 * - OpenAI に切り替えるときだけ AI_REVIEW_PROVIDER=openai
 * - モデル: ANTHROPIC_MODEL / OPENAI_MODEL（任意）
 */
export async function checkReportText(ctx: ReportAiContext): Promise<string | null> {
  const backend = resolveReviewBackend();
  if (!backend) return null;

  const userPayload = buildUserPayload(ctx);
  let raw: string | null = null;
  try {
    raw = backend === "anthropic" ? await runAnthropic(userPayload) : await runOpenAi(userPayload);
  } catch {
    return null;
  }
  if (!raw) return null;
  return parseAiJson(raw);
}

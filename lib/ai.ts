import OpenAI from "openai";

/** 作業内容・明日の作業が抽象的でないか簡易チェック。キー未設定時は null */
export async function checkReportText(workContent: string, tomorrowWork: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたは建設・設計会社の進捗報告のレビュアーです。作業内容と明日の作業が具体的でなければ、1〜3文で改善点だけ返してください。問題なければ「問題なし」とだけ返してください。",
      },
      {
        role: "user",
        content: `作業内容:\n${workContent}\n\n明日の作業:\n${tomorrowWork}`,
      },
    ],
    max_tokens: 300,
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text || text.includes("問題なし")) return null;
  return text;
}

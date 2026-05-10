export type PostTeamsMarkdownResult =
  | { ok: true; status: number }
  | { ok: false; error?: string };

/** Teams Incoming Webhook に Markdown を投稿（12 秒で打ち切り） */
export async function postTeamsMarkdown(text: string): Promise<PostTeamsMarkdownResult> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return { ok: false, error: "TEAMS_WEBHOOK_URL not set" };

  const ms = 12_000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true, status: res.status };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      return { ok: false, error: `Fetch timed out after ${ms}ms` };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(id);
  }
}

/** Teams Incoming Webhook に Markdown を投稿 */
export async function postTeamsMarkdown(text: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return { ok: false, error: "TEAMS_WEBHOOK_URL not set" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

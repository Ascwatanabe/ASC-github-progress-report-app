import { NextResponse } from "next/server";
import { runTeamsDailySummary, runUnreportedNotifications } from "@/lib/cron";

type Task = "teams_evening" | "teams_morning" | "unreported";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  return Boolean(secret && auth === `Bearer ${secret}`);
}

async function runTask(task: Task) {
  if (task === "teams_evening") {
    const teams = await runTeamsDailySummary("evening");
    return { task, teams };
  }
  if (task === "teams_morning") {
    const teams = await runTeamsDailySummary("morning");
    return { task, teams };
  }
  if (task === "unreported") {
    return { task, ...(await runUnreportedNotifications()) };
  }
  return null;
}

/** Vercel Cron は GET + Authorization: Bearer CRON_SECRET（ダッシュボードで CRON_SECRET を設定すると付与） */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const raw = url.searchParams.get("task") ?? "teams_evening";
  const task = raw as Task;
  try {
    const result = await runTask(task);
    if (!result) {
      return NextResponse.json({ error: "unknown task" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** 手動実行用 POST JSON: { "task": "teams_evening" | "teams_morning" | "unreported" } */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { task?: Task };
  const task = body.task ?? "teams_evening";
  try {
    const result = await runTask(task);
    if (!result) {
      return NextResponse.json({ error: "unknown task" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

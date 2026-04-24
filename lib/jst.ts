const TZ = "Asia/Tokyo";

/** 今日の日付 YYYY-MM-DD（日本時間） */
export function todayJstYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function formatJstDateTime(dt: Date): string {
  return dt.toLocaleString("ja-JP", { timeZone: TZ });
}

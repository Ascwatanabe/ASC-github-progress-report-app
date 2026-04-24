/** 青: 順調 / 黄: 要確認 / 赤: 要対処 */
export type Traffic = "blue" | "yellow" | "red";

export function computeTraffic(hasProblem: boolean, nextJobWithin2Days: boolean): Traffic {
  if (hasProblem && !nextJobWithin2Days) return "red";
  if (!hasProblem && nextJobWithin2Days) return "blue";
  return "yellow";
}

export function trafficLabel(t: Traffic): string {
  switch (t) {
    case "red":
      return "要対処（問題あり・次の仕事なし）";
    case "yellow":
      return "要確認";
    case "blue":
      return "順調";
  }
}

export function trafficEmoji(t: Traffic): string {
  if (t === "red") return "🔴";
  if (t === "yellow") return "🟡";
  return "🔵";
}

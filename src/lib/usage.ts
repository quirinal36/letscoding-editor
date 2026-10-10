import type { Usage } from "./types";

export function monthlyUsagePercent(usage: Usage | null) {
  const limit = usage?.monthlyLimitUsd ?? 0;
  const remaining = Math.max(
    0,
    limit -
      (usage?.monthCostUsd ?? 0) -
      (usage?.monthReservedUsd ?? usage?.reservedUsd ?? 0),
  );
  return limit > 0 ? Math.min(100, Math.floor((remaining / limit) * 100)) : 0;
}

export function monthlyUsageLabel(usage: Usage | null, now: number) {
  const percent = monthlyUsagePercent(usage);
  const korea = new Date(now + 9 * 60 * 60 * 1000);
  const year = korea.getUTCFullYear(),
    month = korea.getUTCMonth();
  const days =
    (Date.UTC(year, month + 1, 1) - Date.UTC(year, month, korea.getUTCDate())) /
    86400000;
  return `${percent}% 남음 (${days}일 후 초기화)`;
}

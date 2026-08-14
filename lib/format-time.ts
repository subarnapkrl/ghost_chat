export function formatRelativeTime(
  date: Date | string,
  now: number = Date.now(),
): string {
  const then =
    typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diffMs = now - then;

  if (diffMs < 1000) return "just now";

  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(then).toLocaleDateString();
}

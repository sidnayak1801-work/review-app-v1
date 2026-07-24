const STAR_FILL = "#22c55e";
const STAR_EMPTY = "#d1d5db";

export { STAR_FILL, STAR_EMPTY };

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (minutes < 60) {
    return rtf.format(Math.sign(diffMs) * Math.max(minutes, 1), "minute");
  }
  if (hours < 48) {
    return rtf.format(Math.sign(diffMs) * hours, "hour");
  }
  if (days < 30) {
    return rtf.format(Math.sign(diffMs) * days, "day");
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export function statusBadgeTone(
  status: string,
): "success" | "warning" | "critical" | "info" | "neutral" {
  switch (status) {
    case "APPROVED":
    case "PUBLISHED":
    case "ANSWERED":
    case "SENT":
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "SCHEDULED":
    case "PROCESSING":
      return "warning";
    case "REJECTED":
    case "HIDDEN":
    case "FAILED":
    case "CANCELLED":
      return "critical";
    default:
      return "neutral";
  }
}

export function avatarInitial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

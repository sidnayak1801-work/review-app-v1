import { statusBadgeTone } from "../../lib/ui-format";

interface ModerationStatusBadgeProps {
  status: string;
  label?: string;
}

export function ModerationStatusBadge({
  status,
  label,
}: ModerationStatusBadgeProps) {
  return <s-badge tone={statusBadgeTone(status)}>{label ?? status}</s-badge>;
}

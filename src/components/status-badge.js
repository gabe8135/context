import { statusLabel, statusTone } from "@/lib/status-labels";

export function StatusBadge({ status, label, className = "" }) {
  return <span className={`badge status-badge ${className}`.trim()} data-tone={statusTone(status)}>{label || statusLabel(status)}</span>;
}

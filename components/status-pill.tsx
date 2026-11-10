import { statusLabel } from "@/lib/format";

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}

"use client";

export function PrintButton({ label = "Cetak bukti" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-quiet" onClick={() => window.print()}>
      {label}
    </button>
  );
}

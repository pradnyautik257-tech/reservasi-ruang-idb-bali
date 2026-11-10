"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <div className="wrap">
      <div className="empty" style={{ marginTop: "var(--space-2xl)" }}>
        <div className="empty-icon" aria-hidden="true">
          !
        </div>
        <h3>Sistem tidak dapat menampilkan halaman</h3>
        <p>
          Terjadi kesalahan saat memuat data. Data yang tersimpan tidak hilang. Coba muat ulang halaman atau kembali ke
          beranda.
        </p>
        <div className="btn-group">
          <button className="btn btn-primary" type="button" onClick={() => reset()}>
            Coba lagi
          </button>
          <a className="btn btn-ghost" href="/">
            Ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}

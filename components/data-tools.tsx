"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { resetDemoAction } from "@/app/actions/data";

export function DataTools({
  counts,
}: {
  counts: { reservations: number; audit: number; users: number; rooms: number };
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reset() {
    if (confirmation.trim().toUpperCase() !== "RESET") return;
    setBusy(true);
    setError("");
    const result = await resetDemoAction();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    setConfirmation("");
    push(`Data demo dipulihkan (${result.data.count} reservasi).`, "success");
    router.refresh();
  }

  return (
    <>
      <div className="settings-grid" style={{ marginTop: "var(--space-m)" }}>
        <div className="panel" style={{ display: "grid", gap: "var(--space-s)", alignContent: "start" }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Cadangan</p>
              <h3>Ekspor data</h3>
            </div>
            <Icon name="database" />
          </div>
          <p className="tiny muted">
            Unduh salinan JSON dari ruang, pengguna, reservasi, pengaturan, dan jejak audit. Berkas tidak memuat kata
            sandi atau hash kata sandi.
          </p>
          <div className="dl">
            <div>
              <span>Reservasi</span>
              <span>{counts.reservations}</span>
            </div>
            <div>
              <span>Ruang</span>
              <span>{counts.rooms}</span>
            </div>
            <div>
              <span>Jejak audit</span>
              <span>{counts.audit}</span>
            </div>
            <div>
              <span>Akun</span>
              <span>{counts.users}</span>
            </div>
          </div>
          <div className="btn-group">
            <a className="btn btn-primary" href="/api/export">
              <Icon name="download" /> Ekspor JSON
            </a>
          </div>
          <p className="tiny muted">
            Impor massal tidak disediakan di antarmuka. Untuk pemulihan produksi, gunakan cadangan PostgreSQL
            (<span className="mono">pg_dump</span>) atau Supabase Backup.
          </p>
        </div>

        <div className="danger-zone" style={{ alignContent: "start" }}>
          <h3>Zona berbahaya</h3>
          <p className="tiny">
            Reset akan menghapus seluruh reservasi, riwayat, dan jejak audit, lalu memuat kembali contoh data demo.
            Akun dan data ruang dipertahankan. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="dl" style={{ background: "var(--surface)", padding: "0 var(--space-s)" }}>
            <div>
              <span>Reservasi dihapus</span>
              <span>{counts.reservations}</span>
            </div>
            <div>
              <span>Jejak audit</span>
              <span>{counts.audit}</span>
            </div>
          </div>
          <div>
            <button className="btn btn-danger" type="button" onClick={() => setOpen(true)}>
              <Icon name="refresh" /> Reset data demo
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "var(--space-m)", display: "grid", gap: "var(--space-s)" }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Catatan teknis</p>
            <h3>Keamanan &amp; batasan</h3>
          </div>
          <span className="badge">Mode database lokal</span>
        </div>
        <div className="dl">
          <div>
            <span>Penyimpanan</span>
            <span>PostgreSQL lokal (PGlite) pada folder <span className="mono">.data/pglite</span>.</span>
          </div>
          <div>
            <span>Kata sandi</span>
            <span>Hash scrypt dengan salt unik per akun. Kata sandi asli tidak pernah disimpan atau dikirim ke klien.</span>
          </div>
          <div>
            <span>Sesi</span>
            <span>Token acak 32 byte, disimpan sebagai hash SHA-256, dikirim lewat cookie HttpOnly + SameSite=Lax.</span>
          </div>
          <div>
            <span>Otorisasi</span>
            <span>Setiap server action memeriksa sesi dan peran. RLS Supabase disiapkan pada folder <span className="mono">supabase/</span>.</span>
          </div>
          <div>
            <span>Validasi</span>
            <span>Zod di server + aturan bisnis bersama. Bentrok jadwal diperiksa ulang di dalam transaksi.</span>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset ke data demo?"
        subtitle="Semua perubahan reservasi akan hilang."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={reset}
              disabled={busy || confirmation.trim().toUpperCase() !== "RESET"}
            >
              {busy ? "Mereset…" : "Reset data"}
            </button>
          </>
        }
      >
        <p>
          Ketik <span className="kbd">RESET</span> untuk mengonfirmasi. Reservasi, riwayat, dan jejak audit akan dihapus
          lalu contoh data demo dimuat ulang.
        </p>
        <div className="field" style={{ marginTop: "var(--space-s)" }}>
          <label htmlFor="reset-confirm">Konfirmasi</label>
          <input
            className="input mono"
            id="reset-confirm"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            data-autofocus
            placeholder="RESET"
          />
        </div>
        {error ? (
          <div className="notice notice-bad" style={{ marginTop: "var(--space-s)" }}>
            <Icon name="alert" />
            <div>{error}</div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

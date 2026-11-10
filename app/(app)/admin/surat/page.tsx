import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listLetters } from "@/lib/letters";
import { fmtDateShort, fmtDateTime, timeLabel } from "@/lib/format";
import { BackfillLettersButton } from "@/components/backfill-letters";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Surat Peminjaman" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLettersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const q = (single(params.q) || "").trim().toLowerCase();
  const all = await listLetters(300);
  const letters = q
    ? all.filter((item) =>
        `${item.number} ${item.reservationCode} ${item.activity} ${item.borrowerName} ${item.roomName}`
          .toLowerCase()
          .includes(q),
      )
    : all;
  const active = all.filter((item) => item.reservationStatus === "disetujui").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Arsip dokumen</p>
          <h1>Surat Peminjaman</h1>
          <p className="page-subtitle">
            Seluruh surat diterbitkan otomatis saat pengajuan disetujui. Nomor surat bersifat unik dan tidak dapat
            dibuat ulang secara manual. Surat yang peminjamannya dibatalkan ditandai tidak berlaku.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/pengaturan">
            <Icon name="settings" /> Pengaturan Surat
          </Link>
          <BackfillLettersButton />
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="file" /></span>
          <div className="stat-meta">
            <span className="stat-value">{all.length}</span>
            <span className="stat-label">Total surat terbit</span>
            <span className="stat-detail">Nomor unik per peminjaman</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon is-ok"><Icon name="check" /></span>
          <div className="stat-meta">
            <span className="stat-value">{active}</span>
            <span className="stat-label">Surat berlaku</span>
            <span className="stat-detail">Peminjaman masih disetujui</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon is-warn"><Icon name="alert" /></span>
          <div className="stat-meta">
            <span className="stat-value">{all.length - active}</span>
            <span className="stat-label">Tidak berlaku</span>
            <span className="stat-detail">Peminjaman dibatalkan</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="refresh" /></span>
          <div className="stat-meta">
            <span className="stat-value">Otomatis</span>
            <span className="stat-label">Penerbitan</span>
            <span className="stat-detail">Saat pengajuan disetujui</span>
          </div>
        </article>
      </div>

      <div className="filters-bar">
        <form action="/admin/surat" method="get" style={{ display: "contents" }}>
          <div className="field is-search">
            <label htmlFor="as-search">Cari surat</label>
            <div className="filter-search">
              <Icon name="search" />
              <input
                className="input"
                id="as-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nomor surat, kode peminjaman, kegiatan, atau peminjam"
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Cari</button>
          {q ? <Link className="btn btn-ghost" href="/admin/surat">Atur Ulang</Link> : null}
        </form>
      </div>

      <div className="filter-summary">
        <span><strong>{letters.length}</strong> surat ditemukan</span>
        <span className="tiny muted">Gunakan “Terbitkan surat tertunda” untuk peminjaman lama yang belum memiliki surat.</span>
      </div>

      {letters.length ? (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>Nomor surat</th>
                <th>Peminjaman</th>
                <th>Peminjam</th>
                <th>Kegiatan &amp; ruang</th>
                <th>Diterbitkan</th>
                <th>Status</th>
                <th className="cell-actions">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {letters.map((item) => {
                const eligible = item.reservationStatus === "disetujui";
                return (
                  <tr key={item.id}>
                    <td><span className="cell-strong mono">{item.number}</span></td>
                    <td>
                      <span className="cell-strong mono">{item.reservationCode}</span>
                      <span className="cell-sub">{fmtDateShort(item.date)} · {timeLabel(item.start)}–{timeLabel(item.end)}</span>
                    </td>
                    <td><span className="cell-strong">{item.borrowerName}</span></td>
                    <td>
                      <span className="cell-strong">{item.activity}</span>
                      <span className="cell-sub">{item.roomName}</span>
                    </td>
                    <td><span className="cell-strong">{fmtDateTime(item.issuedAt)}</span></td>
                    <td>
                      {eligible ? <StatusPill status={item.reservationStatus} /> : <span className="pill pill-dibatalkan">Tidak berlaku</span>}
                    </td>
                    <td className="cell-actions">
                      {eligible ? (
                        <>
                          <Link className="btn btn-ghost btn-sm" href={`/surat/${item.reservationId}`}>Pratinjau</Link>
                          <a className="btn btn-quiet btn-sm" href={`/api/surat/${item.reservationId}/pdf?download=1`}>PDF</a>
                          <Link className="btn btn-quiet btn-sm" href={`/surat/${item.reservationId}?print=1`}>Cetak</Link>
                        </>
                      ) : (
                        <span className="tiny muted">Dicabut</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="file" /></div>
          <h3>{q ? "Surat tidak ditemukan" : "Belum ada surat"}</h3>
          <p>
            {q
              ? "Coba kata kunci lain atau tampilkan seluruh arsip."
              : "Surat dibuat otomatis saat admin menyetujui permohonan. Gunakan tombol terbitkan untuk peminjaman lama yang belum memiliki surat."}
          </p>
          <div className="btn-group">
            {q ? <Link className="btn btn-ghost" href="/admin/surat">Tampilkan Semua</Link> : null}
            <Link className="btn btn-primary" href="/admin/pengajuan">Buka Pengajuan</Link>
          </div>
        </div>
      )}
    </>
  );
}

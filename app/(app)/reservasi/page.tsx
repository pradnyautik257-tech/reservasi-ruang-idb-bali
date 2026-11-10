import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSettings, listReservations } from "@/lib/data";
import { canCancelReservation } from "@/lib/policy";
import { fmtDateShort, timeLabel } from "@/lib/format";
import { Icon } from "@/components/icons";
import { ReservationCancelButton } from "@/components/reservation-cancel-button";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Peminjaman Saya" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { key: "semua", label: "Semua" },
  { key: "menunggu", label: "Menunggu Persetujuan" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: { q?: string; status?: string; tanggal?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "semua") search.set("status", params.status);
  if (params.tanggal) search.set("tanggal", params.tanggal);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/reservasi?${query}` : "/reservasi";
}

export default async function MyReservationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(["mahasiswa", "dosen"]);
  const settings = await getSettings();
  const params = await searchParams;
  const q = (single(params.q) || "").trim();
  const status = single(params.status) || "semua";
  const tanggal = single(params.tanggal) || "";
  const rawPage = Number(single(params.page)) || 1;

  const reservations = await listReservations({
    userId: user.id,
    status,
    q: q || undefined,
    date: tanggal || undefined,
    limit: 500,
  });

  const totalPages = Math.max(1, Math.ceil(reservations.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const rows = reservations.slice(startIndex, startIndex + PAGE_SIZE);
  const hasFilter = Boolean(q || tanggal || status !== "semua");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Riwayat peminjaman</p>
          <h1>Peminjaman Saya</h1>
          <p className="page-subtitle">
            Pantau seluruh pengajuan, status persetujuan, dan dokumen peminjaman. Gunakan pencarian atau filter untuk
            menemukan pengajuan tertentu.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-primary" href="/reservasi/baru">
            <Icon name="plus" /> Ajukan Peminjaman
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <form action="/reservasi" method="get" style={{ display: "contents" }}>
          <div className="field is-search">
            <label htmlFor="r-search">Cari pengajuan</label>
            <div className="filter-search">
              <Icon name="search" />
              <input
                className="input"
                id="r-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Kode, nama kegiatan, atau ruangan"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-status">Status</label>
            <select className="select" id="r-status" name="status" defaultValue={status}>
              {STATUS_TABS.map((tab) => (
                <option key={tab.key} value={tab.key}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="r-date">Tanggal kegiatan</label>
            <input className="input" id="r-date" name="tanggal" type="date" defaultValue={tanggal} />
          </div>
          <button className="btn btn-primary" type="submit">
            <Icon name="filter" /> Terapkan
          </button>
          {hasFilter ? <Link className="btn btn-ghost" href="/reservasi">Atur Ulang</Link> : null}
        </form>
      </div>

      <div className="filter-summary">
        <span><strong>{reservations.length}</strong> pengajuan ditemukan{hasFilter ? " untuk filter ini" : ""}</span>
        <div className="quick-filters">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildHref({ q, tanggal, status: tab.key })}
              className={`quick-filter${status === tab.key ? " is-active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {rows.length ? (
        <>
          <div className="table-wrap table-actions-sticky">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Kegiatan</th>
                  <th>Ruangan</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th className="cell-actions">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((reservation) => (
                  <tr key={reservation.id}>
                    <td><span className="cell-strong mono">{reservation.code}</span></td>
                    <td>
                      <span className="cell-strong">{reservation.activity}</span>
                      <span className="cell-sub">{reservation.category} · {reservation.participants} peserta</span>
                    </td>
                    <td>
                      <span className="cell-strong">{reservation.room?.name}</span>
                      <span className="cell-sub">{reservation.room?.code} · {reservation.room?.building}</span>
                    </td>
                    <td><span className="cell-strong">{fmtDateShort(reservation.date)}</span></td>
                    <td className="mono">{timeLabel(reservation.start)}–{timeLabel(reservation.end)}</td>
                    <td><StatusPill status={reservation.status} /></td>
                    <td className="cell-actions">
                      <Link className="btn btn-ghost btn-sm" href={`/reservasi/${reservation.id}`}>
                        Detail
                      </Link>
                      {reservation.status === "disetujui" ? (
                        <Link className="btn btn-quiet btn-sm" href={`/surat/${reservation.id}`}>
                          Surat
                        </Link>
                      ) : null}
                      {canCancelReservation(reservation, user, settings).allowed ? (
                        <ReservationCancelButton
                          reservation={reservation}
                          viewer={user}
                          settings={settings}
                          label="Batalkan"
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="pagination">
              <span>Halaman {page} dari {totalPages} · {PAGE_SIZE} pengajuan per halaman</span>
              <div className="pagination-links">
                <Link
                  className={`pagination-link${page <= 1 ? " is-disabled" : ""}`}
                  href={buildHref({ q, tanggal, status, page: page - 1 })}
                  aria-label="Halaman sebelumnya"
                >
                  <Icon name="arrowRight" className="icon-flip" />
                </Link>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                  <Link
                    key={number}
                    className={`pagination-link${number === page ? " is-active" : ""}`}
                    href={buildHref({ q, tanggal, status, page: number })}
                    aria-current={number === page ? "page" : undefined}
                  >
                    {number}
                  </Link>
                ))}
                <Link
                  className={`pagination-link${page >= totalPages ? " is-disabled" : ""}`}
                  href={buildHref({ q, tanggal, status, page: page + 1 })}
                  aria-label="Halaman berikutnya"
                >
                  <Icon name="arrowRight" />
                </Link>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="list" /></div>
          <h3>{hasFilter ? "Tidak ada pengajuan yang cocok" : "Belum ada pengajuan"}</h3>
          <p>
            {hasFilter
              ? "Ubah kata kunci, status, atau tanggal untuk melihat pengajuan lain."
              : "Pengajuan peminjaman yang Anda kirim akan tampil di sini beserta status terbarunya."}
          </p>
          {hasFilter ? (
            <Link className="btn btn-ghost" href="/reservasi">Tampilkan Semua</Link>
          ) : (
            <Link className="btn btn-primary" href="/reservasi/baru">Ajukan Peminjaman</Link>
          )}
        </div>
      )}
    </>
  );
}

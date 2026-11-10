import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSettings, listReservations } from "@/lib/data";
import { fmtDateShort } from "@/lib/format";
import { AdminQueue } from "@/components/admin-queue";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Pengajuan Peminjaman" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 12;

const TABS = [
  { key: "menunggu", label: "Menunggu" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "dibatalkan", label: "Dibatalkan" },
  { key: "semua", label: "Semua" },
];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: { status: string; q?: string; tanggal?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "semua") search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.tanggal) search.set("tanggal", params.tanggal);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin/pengajuan?${query}` : "/admin/pengajuan";
}

export default async function AdminReservationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(["admin"]);
  const settings = await getSettings();
  const params = await searchParams;
  const status = single(params.status) || "menunggu";
  const q = (single(params.q) || "").trim();
  const tanggal = single(params.tanggal) || "";
  const rawPage = Number(single(params.page)) || 1;

  const all = await listReservations({ limit: 1000 });
  const counts = {
    menunggu: all.filter((item) => item.status === "menunggu").length,
    disetujui: all.filter((item) => item.status === "disetujui").length,
    ditolak: all.filter((item) => item.status === "ditolak").length,
    dibatalkan: all.filter((item) => item.status === "dibatalkan").length,
    semua: all.length,
  };
  const filtered = all.filter((item) => {
    if (status !== "semua" && item.status !== status) return false;
    if (tanggal && item.date !== tanggal) return false;
    if (!q) return true;
    const haystack = [item.code, item.activity, item.category, item.user?.fullName, item.user?.email, item.room?.name, item.room?.code]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = Boolean(q || tanggal || status !== "menunggu");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Antrean keputusan</p>
          <h1>Pengajuan Peminjaman</h1>
          <p className="page-subtitle">
            Tinjau detail permohonan, periksa bentrok jadwal, lalu setujui atau tolak dengan catatan yang jelas. Setiap
            keputusan tercatat pada jejak audit dan surat diterbitkan otomatis saat disetujui.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/jadwal">
            <Icon name="calendar" /> Lihat Jadwal
          </Link>
          <Link className="btn btn-primary" href="/admin/pengajuan?status=menunggu">
            <Icon name="clock" /> Antrean Menunggu
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <form action="/admin/pengajuan" method="get" style={{ display: "contents" }}>
          <div className="field is-search">
            <label htmlFor="aq-search">Cari pengajuan</label>
            <div className="filter-search">
              <Icon name="search" />
              <input
                className="input"
                id="aq-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Kode, kegiatan, ruang, atau pemohon"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="aq-status">Status</label>
            <select className="select" id="aq-status" name="status" defaultValue={status}>
              {TABS.map((tab) => (
                <option key={tab.key} value={tab.key}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="aq-date">Tanggal kegiatan</label>
            <input className="input" id="aq-date" type="date" name="tanggal" defaultValue={tanggal} />
          </div>
          <button className="btn btn-primary" type="submit"><Icon name="filter" /> Terapkan</button>
          {hasFilter ? <Link className="btn btn-ghost" href="/admin/pengajuan">Atur Ulang</Link> : null}
        </form>
      </div>

      <div className="filter-summary">
        <span><strong>{filtered.length}</strong> pengajuan ditemukan{hasFilter ? " untuk filter ini" : ""}</span>
        <div className="quick-filters">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildHref({ status: tab.key, q, tanggal })}
              className={`quick-filter${status === tab.key ? " is-active" : ""}`}
            >
              {tab.label} <span className="num">({counts[tab.key as keyof typeof counts]})</span>
            </Link>
          ))}
        </div>
      </div>

      {rows.length ? (
        <>
          <AdminQueue reservations={rows} viewer={user} settings={settings} />
          {totalPages > 1 ? (
            <div className="pagination">
              <span>Halaman {page} dari {totalPages} · {PAGE_SIZE} pengajuan per halaman</span>
              <div className="pagination-links">
                <Link
                  className={`pagination-link${page <= 1 ? " is-disabled" : ""}`}
                  href={buildHref({ status, q, tanggal, page: page - 1 })}
                  aria-label="Halaman sebelumnya"
                >
                  <Icon name="arrowRight" className="icon-flip" />
                </Link>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                  <Link
                    key={number}
                    className={`pagination-link${number === page ? " is-active" : ""}`}
                    href={buildHref({ status, q, tanggal, page: number })}
                    aria-current={number === page ? "page" : undefined}
                  >
                    {number}
                  </Link>
                ))}
                <Link
                  className={`pagination-link${page >= totalPages ? " is-disabled" : ""}`}
                  href={buildHref({ status, q, tanggal, page: page + 1 })}
                  aria-label="Halaman berikutnya"
                >
                  <Icon name="arrowRight" />
                </Link>
              </div>
            </div>
          ) : null}
          <p className="tiny muted" style={{ marginTop: 12 }}>
            Keputusan terakhir diperbarui {fmtDateShort(new Date().toISOString().slice(0, 10))}. Persetujuan akan ditolak
            sistem bila bentrok dengan peminjaman lain yang sudah disetujui.
          </p>
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name={q ? "search" : status === "menunggu" ? "check" : "filter"} /></div>
          <h3>
            {q
              ? `Tidak ada hasil untuk “${q}”`
              : status === "menunggu"
                ? "Antrean bersih"
                : "Tidak ada pengajuan pada filter ini"}
          </h3>
          <p>
            {q
              ? "Coba kata kunci lain atau hapus pencarian untuk melihat seluruh antrean."
              : status === "menunggu"
                ? "Tidak ada pengajuan yang menunggu keputusan. Semua permintaan sudah diproses."
                : "Ubah filter status atau tampilkan semua pengajuan."}
          </p>
          <Link className="btn btn-ghost" href={hasFilter ? "/admin/pengajuan" : "/admin/pengajuan?status=semua"}>
            {hasFilter ? "Atur Ulang Filter" : "Lihat Semua Pengajuan"}
          </Link>
        </div>
      )}
    </>
  );
}

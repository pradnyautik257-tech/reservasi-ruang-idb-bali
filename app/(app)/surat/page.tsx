import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listLetters } from "@/lib/letters";
import { fmtDate, fmtDateTime, timeLabel } from "@/lib/format";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Surat Peminjaman" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LettersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (single(params.q) || "").trim().toLowerCase();
  const allLetters = await listLetters(300, user.id);
  const letters = q
    ? allLetters.filter((letter) =>
        `${letter.number} ${letter.activity} ${letter.roomName} ${letter.reservationCode}`.toLowerCase().includes(q),
      )
    : allLetters;
  const eligible = letters.filter((letter) => letter.reservationStatus === "disetujui").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Dokumen resmi</p>
          <h1>Surat Peminjaman</h1>
          <p className="page-subtitle">
            Surat diterbitkan otomatis setelah pengajuan disetujui. Buka pratinjau A4, unduh PDF, atau cetak dokumen
            untuk keperluan administrasi.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/reservasi?status=disetujui">
            <Icon name="check" /> Peminjaman Disetujui
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <form action="/surat" method="get" style={{ display: "contents" }}>
          <div className="field is-search">
            <label htmlFor="s-search">Cari surat</label>
            <div className="filter-search">
              <Icon name="search" />
              <input
                className="input"
                id="s-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Nomor surat, kegiatan, atau ruangan"
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Cari</button>
          {q ? <Link className="btn btn-ghost" href="/surat">Atur Ulang</Link> : null}
        </form>
      </div>

      <div className="filter-summary">
        <span><strong>{letters.length}</strong> surat ditemukan · {eligible} dapat digunakan</span>
        <span className="tiny muted">Nomor surat dibuat oleh sistem, bukan dibuat manual.</span>
      </div>

      {letters.length ? (
        <div className="letter-card-list">
          {letters.map((letter) => {
            const active = letter.reservationStatus === "disetujui";
            return (
              <article className="letter-card" key={letter.id}>
                <div className="letter-card-main">
                  <span className="letter-icon"><Icon name="file" /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="row-between" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 7 }}>
                      <span className="mono">{letter.number}</span>
                      <StatusPill status={letter.reservationStatus} />
                    </div>
                    <h3 style={{ marginTop: 4 }}>{letter.activity}</h3>
                    <div className="letter-card-meta">
                      <span>{letter.roomName}</span>
                      <span>{fmtDate(letter.date, { short: true })} · {timeLabel(letter.start)}–{timeLabel(letter.end)}</span>
                      <span>Peminjam: {letter.borrowerName}</span>
                      <span>Terbit {fmtDateTime(letter.issuedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="letter-card-actions">
                  {active ? (
                    <>
                      <Link className="btn btn-ghost btn-sm" href={`/surat/${letter.reservationId}`}>
                        <Icon name="eye" /> Pratinjau
                      </Link>
                      <a className="btn btn-primary btn-sm" href={`/api/surat/${letter.reservationId}/pdf?download=1`}>
                        <Icon name="download" /> PDF
                      </a>
                      <Link className="btn btn-quiet btn-sm" href={`/surat/${letter.reservationId}?print=1`}>
                        Cetak
                      </Link>
                    </>
                  ) : (
                    <span className="btn btn-disabled btn-sm">Surat tidak berlaku</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="file" /></div>
          <h3>{q ? "Surat tidak ditemukan" : "Belum ada surat peminjaman"}</h3>
          <p>
            {q
              ? "Coba gunakan nomor surat atau nama kegiatan yang lain."
              : "Surat akan muncul di sini setelah admin menyetujui pengajuan peminjaman ruangan Anda."}
          </p>
          <Link className="btn btn-primary" href={q ? "/surat" : "/reservasi/baru"}>
            {q ? "Tampilkan Semua Surat" : "Ajukan Peminjaman"}
          </Link>
        </div>
      )}
    </>
  );
}

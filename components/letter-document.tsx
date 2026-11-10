import type { Letter, LetterSettings, Reservation } from "@/lib/types";
import { fmtDate, timeLabel } from "@/lib/format";

function localISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Blank({ children }: { children?: React.ReactNode }) {
  return <span className="letter-blank">{children ?? "....................."}</span>;
}

export function LetterDocument({
  reservation,
  letter,
  settings,
}: {
  reservation: Reservation;
  letter: Letter;
  settings: LetterSettings;
}) {
  const issued = new Date(letter.issuedAt);
  const issuedISO = localISO(issued);
  const contact = [settings.phone, settings.email, settings.website].filter(Boolean).join(" | ");
  const incomplete = !settings.address || !settings.signatoryName || !settings.signatoryPosition;

  return (
    <article className="letter-paper" aria-label={`Surat peminjaman ruangan ${letter.number}`}>
      <header className="letter-kop">
        <img className="letter-logo" src="/idb-logo.png" alt="" />
        <h1>{settings.institution || "Institut Desain dan Bisnis Bali"}</h1>
        {settings.unit ? <p className="letter-unit">{settings.unit}</p> : null}
        <p>{settings.address || <Blank>Alamat: .....................</Blank>}</p>
        <p>{contact || <Blank>Telepon / Email / Situs: .....................</Blank>}</p>
      </header>

      <div className="letter-rule" />

      <div className="letter-heading">
        <h2>SURAT PEMINJAMAN RUANGAN</h2>
        <p className="letter-number">Nomor: {letter.number}</p>
      </div>

      <p className="letter-date">
        {settings.city || <Blank>.....................</Blank>}, {fmtDate(issuedISO)}
      </p>

      <p className="letter-intro">
        Yang bertanda tangan di bawah ini menerangkan bahwa permohonan peminjaman ruangan berikut telah disetujui oleh
        admin reservasi kampus:
      </p>

      <table className="letter-table">
        <tbody>
          <tr>
            <th scope="row">Kode Peminjaman</th>
            <td className="mono">{reservation.code}</td>
          </tr>
          <tr>
            <th scope="row">Nama Kegiatan</th>
            <td>{reservation.activity}</td>
          </tr>
          <tr>
            <th scope="row">Nama Peminjam</th>
            <td>
              {reservation.user?.fullName ?? "-"}
              <span className="letter-sub">
                {[reservation.user?.identity, reservation.user?.email].filter(Boolean).join(" | ") || "—"}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">Ruangan</th>
            <td>
              {reservation.room?.name ?? "-"} ({reservation.room?.code ?? "-"})
              <span className="letter-sub">
                {reservation.room
                  ? `${reservation.room.building}, lantai ${reservation.room.floor}`
                  : "Lokasi belum tersedia"}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">Tanggal Penggunaan</th>
            <td>{fmtDate(reservation.date, { weekday: true })}</td>
          </tr>
          <tr>
            <th scope="row">Waktu</th>
            <td>
              {timeLabel(reservation.start)} - {timeLabel(reservation.end)}
            </td>
          </tr>
          <tr>
            <th scope="row">Jumlah Peserta</th>
            <td>{reservation.participants} orang</td>
          </tr>
          <tr>
            <th scope="row">Tujuan Peminjaman</th>
            <td>{reservation.purpose || `Kegiatan ${reservation.activity}`}</td>
          </tr>
          {reservation.note ? (
            <tr>
              <th scope="row">Keterangan Tambahan</th>
              <td>{reservation.note}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="letter-closing">
        Demikian surat peminjaman ruangan ini dibuat berdasarkan data permohonan yang tersimpan pada sistem, untuk
        dipergunakan sebagaimana mestinya.
      </p>

      <div className="letter-signature">
        <p>
          {settings.city || <Blank>.....................</Blank>}, {fmtDate(issuedISO)}
        </p>
        <p>{settings.signatoryPosition || <Blank>Jabatan: .....................</Blank>}</p>
        <div className="letter-sign-space" aria-hidden="true" />
        <p className="letter-sign-name">{settings.signatoryName || "....................."}</p>
        {settings.signatoryNip ? <p>NIP. {settings.signatoryNip}</p> : null}
      </div>

      {incomplete ? (
        <p className="letter-note">
          Catatan: bagian bertanda titik-titik belum diatur pada konfigurasi surat dan perlu dilengkapi oleh admin.
        </p>
      ) : null}

      <footer className="letter-footer">
        <span>Dokumen dihasilkan oleh Sistem Peminjaman Ruangan IDB Bali.</span>
        <span>Nomor: {letter.number}</span>
      </footer>
    </article>
  );
}

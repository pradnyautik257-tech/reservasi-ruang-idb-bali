import Link from "next/link";
import { homeFor, requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { Icon } from "@/components/icons";

export const metadata = { title: "Akses ditolak" };

export default async function ForbiddenPage() {
  const user = await requireUser();

  const explanation =
    user.role === "admin"
      ? "Fungsi pengajuan hanya tersedia untuk mahasiswa dan dosen. Gunakan panel admin untuk memproses permintaan."
      : "Menu administrasi hanya dapat dibuka oleh admin reservasi.";

  return (
    <div className="wrap">
      <div className="empty" style={{ marginTop: "var(--space-xl)" }}>
        <div className="empty-icon">
          <Icon name="shield" />
        </div>
        <h3>Halaman ini bukan untuk peran Anda</h3>
        <p>
          Anda masuk sebagai <strong>{roleLabel(user.role)}</strong>. {explanation}
        </p>
        <div className="btn-group">
          <Link className="btn btn-primary" href={homeFor(user.role)}>
            Kembali ke halaman utama
          </Link>
          <Link className="btn btn-ghost" href="/ruang">
            Lihat daftar ruang
          </Link>
        </div>
      </div>
    </div>
  );
}

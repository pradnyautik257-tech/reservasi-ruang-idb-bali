import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="empty" style={{ marginTop: "var(--space-xl)" }}>
        <div className="empty-icon">
          <Icon name="search" />
        </div>
        <h3>Halaman tidak ditemukan</h3>
        <p>Tautan mungkin sudah berubah atau data yang Anda cari sudah tidak tersedia.</p>
        <div className="btn-group">
          <Link className="btn btn-primary" href="/">
            Ke beranda
          </Link>
          <Link className="btn btn-ghost" href="/ruang">
            Lihat daftar ruang
          </Link>
        </div>
      </div>
    </div>
  );
}

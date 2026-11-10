import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSettings, getStats } from "@/lib/data";
import { getLetterSettings } from "@/lib/letters";
import { Icon } from "@/components/icons";
import { DataTools } from "@/components/data-tools";
import { LetterSettingsForm } from "@/components/letter-settings-form";
import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = { title: "Pengaturan Sistem" };

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const [settings, letterSettings, stats] = await Promise.all([
    getSettings(),
    getLetterSettings(),
    getStats(),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Konfigurasi layanan</p>
          <h1>Pengaturan Sistem</h1>
          <p className="page-subtitle">
            Atur jam operasional, durasi peminjaman, batas pengajuan, dan naskah surat. Perubahan hanya berlaku untuk
            pengajuan berikutnya dan tercatat pada jejak audit.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/pengguna">
            <Icon name="users" /> Data Pengguna
          </Link>
        </div>
      </div>

      <div className="notice notice-info" style={{ marginBottom: 18 }}>
        <Icon name="info" />
        <div>
          <strong>Perubahan konfigurasi bersifat global.</strong>
          <span>Pastikan kebijakan sudah disepakati pengelola ruang sebelum menyimpan perubahan operasional.</span>
        </div>
      </div>

      <SettingsForm settings={settings} />

      <div className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Dokumen resmi</p>
            <h2>Pengaturan surat peminjaman</h2>
            <p className="section-note">
              Kop surat, format nomor, dan penandatangan. Jangan mengisi data yang belum dikonfirmasi pihak kampus.
            </p>
          </div>
          <div className="section-actions">
            <Link className="btn btn-ghost btn-sm" href="/admin/surat">
              <Icon name="file" /> Arsip Surat
            </Link>
          </div>
        </div>
        <LetterSettingsForm settings={letterSettings} />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Pemeliharaan data</p>
            <h2>Data &amp; cadangan</h2>
            <p className="section-note">
              Unduh cadangan JSON atau pulihkan contoh data demo. Gunakan dengan hati-hati karena reset akan menghapus
              reservasi dan jejak audit saat ini.
            </p>
          </div>
        </div>
        <DataTools
          counts={{
            reservations: stats.total,
            audit: stats.audit,
            users: stats.users,
            rooms: stats.rooms,
          }}
        />
      </div>

      <div className="notice notice-warn" style={{ marginTop: 18 }}>
        <Icon name="alert" />
        <div>
          <strong>Data ruang dan surat masih perlu diverifikasi.</strong>
          <span>
            Daftar ruang awal merupakan data contoh pengujian. Ganti dengan data resmi pengelola ruang dan isi kop surat
            hanya setelah data administrasi dikonfirmasi.
          </span>
        </div>
      </div>
    </>
  );
}

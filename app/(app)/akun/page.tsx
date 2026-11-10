import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AccountSettings } from "@/components/account-settings";

export const metadata: Metadata = { title: "Pengaturan Akun" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Akun pengguna</p>
          <h1>Pengaturan Akun</h1>
          <p className="page-subtitle">
            Kelola informasi profil yang digunakan pada pengajuan peminjaman dan dokumen surat, serta perbarui kata sandi
            akun kampus Anda.
          </p>
        </div>
      </div>
      <AccountSettings user={user} />
    </>
  );
}

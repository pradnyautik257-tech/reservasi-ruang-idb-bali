"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { changePasswordAction, updateProfileAction } from "@/app/actions/profile";
import type { SessionUser } from "@/lib/types";

export function AccountSettings({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { push } = useToast();
  const [profile, setProfile] = useState({
    fullName: user.fullName,
    identity: user.identity ?? "",
    program: user.program ?? "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileBusy, setProfileBusy] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy) return;
    setProfileErrors({});
    setProfileBusy(true);
    const result = await updateProfileAction(profile);
    setProfileBusy(false);
    if (!result.ok) {
      setProfileErrors(result.fieldErrors ?? {});
      push(result.message, "error");
      return;
    }
    push("Data profil berhasil diperbarui.", "success");
    router.refresh();
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordErrors({});
    setPasswordBusy(true);
    const result = await changePasswordAction(password);
    if (!result.ok) {
      setPasswordBusy(false);
      setPasswordErrors(result.fieldErrors ?? {});
      push(result.message, "error");
      return;
    }
    push("Kata sandi berhasil diubah. Silakan masuk kembali.", "success");
    window.setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 1000);
  }

  return (
    <div className="account-grid">
      <div className="dashboard-stack">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Profil</p>
              <h3>Informasi pribadi</h3>
              <p>Nama dan identitas ini digunakan pada pengajuan serta surat peminjaman.</p>
            </div>
            <span className="badge">Akun kampus</span>
          </div>
          <form onSubmit={saveProfile} noValidate style={{ display: "grid", gap: 15 }}>
            <div className="form-grid cols-2">
              <div className="field" data-invalid={profileErrors.fullName ? "true" : undefined}>
                <label htmlFor="p-name">Nama lengkap <span className="req">*</span></label>
                <input
                  className="input"
                  id="p-name"
                  value={profile.fullName}
                  onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                  autoComplete="name"
                />
                <p className="field-error">{profileErrors.fullName}</p>
              </div>
              <div className="field">
                <label htmlFor="p-email">Email kampus</label>
                <input className="input" id="p-email" value={user.email} readOnly disabled />
                <p className="field-hint">Email tidak dapat diubah melalui halaman ini.</p>
              </div>
              <div className="field" data-invalid={profileErrors.identity ? "true" : undefined}>
                <label htmlFor="p-identity">NIM / NIP</label>
                <input
                  className="input mono"
                  id="p-identity"
                  value={profile.identity}
                  onChange={(event) => setProfile({ ...profile, identity: event.target.value })}
                  placeholder="Contoh: 2101010234"
                />
                <p className="field-error">{profileErrors.identity}</p>
              </div>
              <div className="field" data-invalid={profileErrors.program ? "true" : undefined}>
                <label htmlFor="p-program">Program studi / unit</label>
                <input
                  className="input"
                  id="p-program"
                  value={profile.program}
                  onChange={(event) => setProfile({ ...profile, program: event.target.value })}
                  placeholder="Contoh: Desain Komunikasi Visual"
                />
                <p className="field-error">{profileErrors.program}</p>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={profileBusy}>
                {profileBusy ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setProfile({ fullName: user.fullName, identity: user.identity ?? "", program: user.program ?? "" });
                  setProfileErrors({});
                }}
              >
                Batalkan
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Keamanan</p>
              <h3>Ubah kata sandi</h3>
              <p>Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.</p>
            </div>
            <Icon name="shield" />
          </div>
          <form onSubmit={savePassword} noValidate style={{ display: "grid", gap: 14 }}>
            <div className="field" data-invalid={passwordErrors.currentPassword ? "true" : undefined}>
              <label htmlFor="p-current">Kata sandi saat ini <span className="req">*</span></label>
              <input
                className="input"
                id="p-current"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password.currentPassword}
                onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
              />
              <p className="field-error">{passwordErrors.currentPassword}</p>
            </div>
            <div className="form-grid cols-2">
              <div className="field" data-invalid={passwordErrors.newPassword ? "true" : undefined}>
                <label htmlFor="p-new">Kata sandi baru <span className="req">*</span></label>
                <input
                  className="input"
                  id="p-new"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password.newPassword}
                  onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                />
                <p className="field-error">{passwordErrors.newPassword}</p>
              </div>
              <div className="field" data-invalid={passwordErrors.confirmPassword ? "true" : undefined}>
                <label htmlFor="p-confirm">Ulangi kata sandi baru <span className="req">*</span></label>
                <input
                  className="input"
                  id="p-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password.confirmPassword}
                  onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                />
                <p className="field-error">{passwordErrors.confirmPassword}</p>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={passwordBusy}>
                {passwordBusy ? "Menyimpan…" : "Ubah Kata Sandi"}
              </button>
              <button className="btn btn-quiet" type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              </button>
            </div>
            <div className="inline-note">
              <Icon name="info" />
              <span>Setelah kata sandi diubah, sesi aktif akan diakhiri dan Anda perlu masuk kembali.</span>
            </div>
          </form>
        </section>
      </div>

      <aside className="dashboard-stack">
        <div className="profile-summary">
          <span className="avatar">{user.initials}</span>
          <div>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <span className="badge">{user.role === "mahasiswa" ? "Mahasiswa" : user.role === "dosen" ? "Dosen / Staf" : user.role}</span>
          </div>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Akun</p>
              <h3>Detail akses</h3>
            </div>
          </div>
          <div className="dl">
            <div>
              <span>Email</span>
              <span>{user.email}</span>
            </div>
            <div>
              <span>Peran</span>
              <span>{user.role === "mahasiswa" ? "Mahasiswa" : user.role === "dosen" ? "Dosen / Staf" : user.role}</span>
            </div>
            <div>
              <span>Identitas</span>
              <span>{user.identity || "Belum diisi"}</span>
            </div>
            <div>
              <span>Program</span>
              <span>{user.program || "Belum diisi"}</span>
            </div>
          </div>
          <p className="inline-note" style={{ marginTop: 14 }}>
            <Icon name="info" />
            <span>Perubahan email, peran, atau status akun hanya dapat dilakukan oleh admin sistem.</span>
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Bantuan</p>
              <h3>Admin reservasi</h3>
            </div>
          </div>
          <p className="tiny muted">
            Untuk kendala jadwal, pembatalan mendadak, atau perubahan data yang tidak tersedia di halaman ini, hubungi
            admin reservasi pada hari kerja pukul 08.00–16.00.
          </p>
        </section>
      </aside>
    </div>
  );
}

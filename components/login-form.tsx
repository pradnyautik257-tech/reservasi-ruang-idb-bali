"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { demoLoginAction, loginAction } from "@/app/actions/auth";
import type { Role } from "@/lib/types";

const DEMO_ACCOUNTS: { role: Role; name: string; email: string; label: string; initials: string; sub: string }[] = [
  { role: "mahasiswa", name: "Nia Pramesti", email: "nia@student.idbbali.ac.id", label: "Mahasiswa", initials: "NP", sub: "NIM 2101010234" },
  { role: "dosen", name: "Dr. Ayu Lestari", email: "ayu@idbbali.ac.id", label: "Dosen", initials: "AL", sub: "NIP 198804152012" },
  { role: "admin", name: "Made Sari", email: "admin@idbbali.ac.id", label: "Admin", initials: "MS", sub: "Bagian Umum & Sarana" },
];

export function LoginForm({
  demoMode,
  demoPassword,
  allowRegister = true,
}: {
  demoMode: boolean;
  demoPassword?: string;
  allowRegister?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<Role | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    void submitAsync(event);
  }

  async function submitAsync(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = "Masukkan email kampus Anda.";
    if (!password) nextErrors.password = "Masukkan kata sandi.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    setBusy(true);
    try {
      const result = await loginAction(formData);
      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    } catch {
      setError("Login tidak dapat diproses saat ini. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(role: Role) {
    setError("");
    setDemoBusy(role);
    try {
      const result = await demoLoginAction(role);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    } catch {
      setError("Masuk cepat demo gagal diproses.");
    } finally {
      setDemoBusy(null);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-brand">
          <Image className="brand-logo" src="/idb-logo-light.png" alt="" width={56} height={38} priority />
          <span className="brand-text">
            <strong>IDB Bali</strong>
            <small>Sistem Peminjaman Ruangan</small>
          </span>
        </div>
        <div style={{ display: "grid", gap: "var(--space-m)" }}>
          <p className="eyebrow" style={{ color: "#bfdbfe" }}>
            Reservasi Ruang Kampus
          </p>
          <h1>
            Ruang yang tepat,
            <br />
            <em>untuk karya terbaik.</em>
          </h1>
          <p className="lead">
            Temukan ruang kampus yang sesuai, ajukan pemakaian, lalu pantau persetujuannya dalam satu alur yang rapi
            dan transparan.
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <Icon name="search" />
              <span>Filter ruang berdasarkan tanggal, waktu, kapasitas, dan fasilitas.</span>
            </div>
            <div className="auth-point">
              <Icon name="shield" />
              <span>Sistem memeriksa bentrok jadwal sebelum pengajuan dikirim.</span>
            </div>
            <div className="auth-point">
              <Icon name="list" />
              <span>Riwayat dan status pengajuan tersimpan dalam satu daftar.</span>
            </div>
            <div className="auth-point">
              <Icon name="users" />
              <span>Hak akses mahasiswa, dosen, dan admin diatur otomatis.</span>
            </div>
          </div>
        </div>
        <div className="auth-foot">
          <span className="auth-campus">Gedung Kampus IDB Bali</span>
          <span>PRD 1.0</span>
          <span>Next.js · PostgreSQL</span>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
            <p className="eyebrow">Masuk</p>
            <h2>Selamat datang kembali</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Gunakan akun kampus Anda untuk mengajukan dan memantau reservasi ruang.
            </p>
          </div>

          {error ? (
            <div className="auth-error is-on" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--space-s)" }}>
            <div className="field" data-invalid={fieldErrors.email ? "true" : undefined}>
              <label htmlFor="login-email">
                Email kampus <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                className="input"
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="nama@student.idbbali.ac.id"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: "" }));
                  setError("");
                }}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                required
              />
              <p className="field-error" id="login-email-error">{fieldErrors.email}</p>
            </div>

            <div className="field" data-invalid={fieldErrors.password ? "true" : undefined}>
              <label htmlFor="login-password">
                Kata sandi <span className="req" aria-hidden="true">*</span>
              </label>
              <div className="pass-wrap">
                <input
                  className="input"
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: "" }));
                    setError("");
                  }}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  required
                />
                <button
                  type="button"
                  className="pass-toggle"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
              <p className="field-error" id="login-password-error">{fieldErrors.password}</p>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Memeriksa akun…" : "Masuk ke sistem"}
            </button>
          </form>

          {allowRegister ? (
            <p className="tiny muted" style={{ textAlign: "center" }}>
              Belum punya akun?{" "}
              <Link className="link-arrow" href="/register">
                Daftar sebagai mahasiswa
              </Link>
            </p>
          ) : (
            <p className="tiny muted" style={{ textAlign: "center" }}>
              Pendaftaran mandiri sedang ditutup. Hubungi admin reservasi untuk pembuatan akun.
            </p>
          )}

          {demoMode ? (
            <div className="auth-demo">
              <div className="auth-demo-head">
                <span>Masuk cepat — mode demo lokal</span>
                <span className="mono" style={{ fontSize: 10.5 }}>tanpa kata sandi</span>
              </div>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  className="demo-btn"
                  onClick={() => demoLogin(account.role)}
                  disabled={busy || demoBusy !== null}
                >
                  <span className="avatar">{account.initials}</span>
                  <span className="grow">
                    <strong>{account.name}</strong>
                    <small>{demoBusy === account.role ? "Membuka sesi…" : account.sub}</small>
                  </span>
                  <span className="pill pill-role">{account.label}</span>
                </button>
              ))}
              {demoPassword ? (
                <div className="auth-demo-password">
                  <span>Kata sandi demo untuk masuk manual</span>
                  <code>{demoPassword}</code>
                </div>
              ) : null}
              <p className="tiny muted" style={{ padding: "6px 4px 2px" }}>
                Tombol ini hanya aktif saat <span className="mono">DEMO_MODE=true</span> di lingkungan lokal. Matikan
                sebelum aplikasi dipublikasikan.
              </p>
            </div>
          ) : (
            <p className="inline-note">
              <Icon name="info" />
              <span>Akun dibuat oleh pengelola sistem. Hubungi admin reservasi bila Anda belum memiliki akses.</span>
            </p>
          )}

          <p className="inline-note">
            <Icon name="shield" />
            <span>Kata sandi diverifikasi di server dan tidak pernah dikirim ke kode frontend.</span>
          </p>
        </div>
      </main>
    </div>
  );
}

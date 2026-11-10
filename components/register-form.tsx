"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { registerAction } from "@/app/actions/auth";
import { registerSchema } from "@/lib/validation";

interface FormState {
  fullName: string;
  email: string;
  identity: string;
  program: string;
  password: string;
  confirm: string;
}

const EMPTY: FormState = {
  fullName: "",
  email: "",
  identity: "",
  program: "",
  password: "",
  confirm: "",
};

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setMessage("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));
      const result = await registerAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    } catch {
      setMessage("Pendaftaran tidak dapat diproses karena gangguan koneksi. Coba lagi.");
    } finally {
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
          <p className="eyebrow" style={{ color: "#93c5fd" }}>
            Pendaftaran mahasiswa
          </p>
          <h1>
            Mulai dari <em>satu ruang.</em>
          </h1>
          <p className="lead">
            Buat akun untuk melihat ketersediaan ruang, mengajukan peminjaman, dan memantau status permohonan Anda.
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <Icon name="shield" />
              <span>Kata sandi di-hash di server dan tidak pernah disimpan sebagai teks biasa.</span>
            </div>
            <div className="auth-point">
              <Icon name="calendar" />
              <span>Ajukan peminjaman dengan pemeriksaan bentrok jadwal otomatis.</span>
            </div>
            <div className="auth-point">
              <Icon name="list" />
              <span>Pantau status: Menunggu, Disetujui, Ditolak, atau Dibatalkan.</span>
            </div>
          </div>
        </div>
        <div className="auth-foot">
          <span>IDB Bali</span>
          <span>Akun mahasiswa</span>
          <span>Next.js · PostgreSQL</span>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card" style={{ width: "min(480px, 100%)" }}>
          <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
            <p className="eyebrow">Daftar</p>
            <h2>Buat akun mahasiswa</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Isi data berikut. Akun admin dibuat oleh pengelola sistem.
            </p>
          </div>

          {message ? (
            <div className="auth-error is-on" role="alert">
              {message}
            </div>
          ) : null}

          <form onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--space-s)" }}>
            <div className="field" data-invalid={errors.fullName ? "true" : undefined}>
              <label htmlFor="reg-name">
                Nama lengkap <span className="req">*</span>
              </label>
              <input
                className="input"
                id="reg-name"
                name="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Nama sesuai data kampus"
                required
              />
              <p className="field-error">{errors.fullName}</p>
            </div>

            <div className="field" data-invalid={errors.email ? "true" : undefined}>
              <label htmlFor="reg-email">
                Email <span className="req">*</span>
              </label>
              <input
                className="input"
                id="reg-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="nama@student.idbbali.ac.id"
                required
              />
              <p className="field-hint">Gunakan email aktif. Email ini dipakai untuk masuk.</p>
              <p className="field-error">{errors.email}</p>
            </div>

            <div className="form-grid cols-2">
              <div className="field" data-invalid={errors.identity ? "true" : undefined}>
                <label htmlFor="reg-nim">NIM</label>
                <input
                  className="input"
                  id="reg-nim"
                  name="identity"
                  value={form.identity}
                  onChange={(event) => update("identity", event.target.value)}
                  placeholder="2101010234"
                />
                <p className="field-error">{errors.identity}</p>
              </div>
              <div className="field" data-invalid={errors.program ? "true" : undefined}>
                <label htmlFor="reg-program">Program studi</label>
                <input
                  className="input"
                  id="reg-program"
                  name="program"
                  value={form.program}
                  onChange={(event) => update("program", event.target.value)}
                  placeholder="Desain Komunikasi Visual"
                />
                <p className="field-error">{errors.program}</p>
              </div>
            </div>

            <div className="field" data-invalid={errors.password ? "true" : undefined}>
              <label htmlFor="reg-password">
                Kata sandi <span className="req">*</span>
              </label>
              <input
                className="input"
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="Minimal 8 karakter"
                required
              />
              <p className="field-hint">Minimal 8 karakter, memuat huruf dan angka.</p>
              <p className="field-error">{errors.password}</p>
            </div>

            <div className="field" data-invalid={errors.confirm ? "true" : undefined}>
              <label htmlFor="reg-confirm">
                Ulangi kata sandi <span className="req">*</span>
              </label>
              <input
                className="input"
                id="reg-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(event) => update("confirm", event.target.value)}
                required
              />
              <p className="field-error">{errors.confirm}</p>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Membuat akun…" : "Daftar dan masuk"}
            </button>
          </form>

          <p className="tiny muted" style={{ textAlign: "center" }}>
            Sudah punya akun?{" "}
            <Link className="link-arrow" href="/login">
              Masuk di sini
            </Link>
          </p>
          <p className="inline-note">
            <Icon name="info" />
            <span>
              Data akun disimpan di database kampus. Gunakan kata sandi unik, bukan kata sandi akun lain.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}

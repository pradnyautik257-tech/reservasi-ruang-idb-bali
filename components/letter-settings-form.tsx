"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { updateLetterSettingsAction } from "@/app/actions/letters";
import { formatLetterNumber } from "@/lib/letter-format";
import type { LetterSettings } from "@/lib/types";

export function LetterSettingsForm({ settings }: { settings: LetterSettings }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<LetterSettings>(settings);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof LetterSettings>(key: K, value: LetterSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await updateLetterSettingsAction(form);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    push("Pengaturan surat disimpan.", "success");
    router.refresh();
  }

  const preview = formatLetterNumber(form, 1);
  const incomplete = !form.address || !form.signatoryName || !form.signatoryPosition;

  return (
    <form className="panel" onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--space-m)" }}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Dokumen resmi</p>
          <h3>Kop surat &amp; penandatangan</h3>
        </div>
        <span className="badge">Khusus admin</span>
      </div>

      <div className="notice notice-info">
        <Icon name="info" />
        <div>
          <strong>Jangan mengisi data yang belum resmi.</strong>
          <span>
            Kolom yang dibiarkan kosong akan tampil sebagai titik-titik pada surat. Isi hanya setelah datanya
            dikonfirmasi pihak kampus.
          </span>
        </div>
      </div>

      <div>
        <p className="eyebrow is-muted" style={{ marginBottom: 8 }}>
          Kop surat
        </p>
        <div className="form-grid">
          <div className="field" data-invalid={fieldErrors.institution ? "true" : undefined}>
            <label htmlFor="ls-institution">
              Nama institusi <span className="req">*</span>
            </label>
            <input
              className="input"
              id="ls-institution"
              value={form.institution}
              onChange={(event) => update("institution", event.target.value)}
            />
            <p className="field-error">{fieldErrors.institution}</p>
          </div>
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="ls-unit">Unit / bagian</label>
              <input
                className="input"
                id="ls-unit"
                value={form.unit}
                onChange={(event) => update("unit", event.target.value)}
                placeholder="Contoh: Bagian Umum dan Sarana"
              />
            </div>
            <div className="field">
              <label htmlFor="ls-city">Kota penerbitan</label>
              <input
                className="input"
                id="ls-city"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                placeholder="Kota pada tanda tangan"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ls-address">Alamat</label>
            <input
              className="input"
              id="ls-address"
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Alamat resmi kampus"
            />
          </div>
          <div className="form-grid cols-3">
            <div className="field">
              <label htmlFor="ls-phone">Telepon</label>
              <input
                className="input"
                id="ls-phone"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ls-email">Email</label>
              <input
                className="input"
                id="ls-email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ls-website">Situs</label>
              <input
                className="input"
                id="ls-website"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="eyebrow is-muted" style={{ marginBottom: 8 }}>
          Penomoran surat
        </p>
        <div className="form-grid cols-2">
          <div className="field" data-invalid={fieldErrors.numberPrefix ? "true" : undefined}>
            <label htmlFor="ls-prefix">
              Prefix <span className="req">*</span>
            </label>
            <input
              className="input"
              id="ls-prefix"
              value={form.numberPrefix}
              onChange={(event) => update("numberPrefix", event.target.value.toUpperCase())}
            />
            <p className="field-hint">Dipakai untuk token {"{prefix}"}.</p>
            <p className="field-error">{fieldErrors.numberPrefix}</p>
          </div>
          <div className="field" data-invalid={fieldErrors.numberFormat ? "true" : undefined}>
            <label htmlFor="ls-format">
              Format nomor <span className="req">*</span>
            </label>
            <input
              className="input mono"
              id="ls-format"
              value={form.numberFormat}
              onChange={(event) => update("numberFormat", event.target.value)}
            />
            <p className="field-hint">
              Token: <span className="mono">{"{seq}"}</span>, <span className="mono">{"{prefix}"}</span>,{" "}
              <span className="mono">{"{year}"}</span>, <span className="mono">{"{month}"}</span>,{" "}
              <span className="mono">{"{day}"}</span>. Wajib memuat {"{seq}"}.
            </p>
            <p className="field-error">{fieldErrors.numberFormat}</p>
          </div>
        </div>
        <div className="dl" style={{ marginTop: 6 }}>
          <div>
            <span>Contoh nomor</span>
            <span className="mono">{preview}</span>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Format bawaan sistem. Sesuaikan dengan tata naskah administrasi kampus. Nomor tetap unik dan tidak berulang.
        </p>
      </div>

      <div>
        <p className="eyebrow is-muted" style={{ marginBottom: 8 }}>
          Pejabat penandatangan
        </p>
        <div className="form-grid cols-3">
          <div className="field">
            <label htmlFor="ls-sign-name">Nama pejabat</label>
            <input
              className="input"
              id="ls-sign-name"
              value={form.signatoryName}
              onChange={(event) => update("signatoryName", event.target.value)}
              placeholder="Sesuai SK/kewenangan"
            />
          </div>
          <div className="field">
            <label htmlFor="ls-sign-position">Jabatan</label>
            <input
              className="input"
              id="ls-sign-position"
              value={form.signatoryPosition}
              onChange={(event) => update("signatoryPosition", event.target.value)}
              placeholder="Contoh: Kepala Bagian Umum"
            />
          </div>
          <div className="field">
            <label htmlFor="ls-sign-nip">NIP / identitas</label>
            <input
              className="input"
              id="ls-sign-nip"
              value={form.signatoryNip}
              onChange={(event) => update("signatoryNip", event.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>
      </div>

      {incomplete ? (
        <div className="notice notice-warn">
          <Icon name="alert" />
          <div>
            <strong>Surat masih memiliki bagian kosong.</strong>
            <span>Alamat, nama pejabat, atau jabatan belum diisi. Surat akan menampilkan titik-titik.</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="notice notice-bad">
          <Icon name="alert" />
          <div>{error}</div>
        </div>
      ) : null}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan pengaturan surat"}
        </button>
      </div>
    </form>
  );
}

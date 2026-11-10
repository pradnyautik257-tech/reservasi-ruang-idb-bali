"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { saveRoomAction } from "@/app/actions/rooms";
import type { Room, RoomInput, RoomStatus, SessionUser } from "@/lib/types";

interface FormState {
  id?: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  capacity: string;
  status: RoomStatus;
  note: string;
  facilities: string[];
}

const EMPTY: FormState = {
  code: "",
  name: "",
  building: "Gedung A",
  floor: "1",
  capacity: "",
  status: "aktif",
  note: "",
  facilities: [],
};

export function RoomManager({
  rooms,
  facilities,
  viewer,
}: {
  rooms: Room[];
  facilities: string[];
  viewer: SessionUser;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setForm({ ...EMPTY, facilities: [] });
    setError("");
    setFieldErrors({});
    setOpen(true);
  }

  function startEdit(room: Room) {
    setForm({
      id: room.id,
      code: room.code,
      name: room.name,
      building: room.building,
      floor: String(room.floor),
      capacity: String(room.capacity),
      status: room.status,
      note: room.note,
      facilities: room.facilities.slice(),
    });
    setError("");
    setFieldErrors({});
    setOpen(true);
  }

  function toggleFacility(name: string) {
    setForm((current) => ({
      ...current,
      facilities: current.facilities.includes(name)
        ? current.facilities.filter((item) => item !== name)
        : [...current.facilities, name],
    }));
  }

  async function submit() {
    setBusy(true);
    setError("");
    const input: RoomInput = {
      id: form.id,
      code: form.code,
      name: form.name,
      building: form.building,
      floor: form.floor,
      capacity: form.capacity,
      status: form.status,
      note: form.note,
      facilities: form.facilities,
    };
    const result = await saveRoomAction(input);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    push(form.id ? "Data ruang diperbarui." : "Ruang baru ditambahkan.", "success");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="notice notice-warn" style={{ marginTop: "var(--space-m)" }}>
        <Icon name="alert" />
        <div>
          <strong>Data contoh untuk pengujian.</strong>
          <span>
            Daftar ruang di bawah bukan data resmi kampus. Ganti nama, kapasitas, fasilitas, dan status sesuai data
            pengelola ruang sebelum digunakan untuk operasional.
          </span>
        </div>
      </div>

      <div className="toolbar">
        <div>
          <p className="eyebrow is-muted" style={{ fontSize: 10 }}>
            Data ruang
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {rooms.length} ruang terdaftar · perubahan langsung tampil pada pencarian.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
          <Icon name="plus" /> Tambah ruang
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Ruang</th>
              <th>Kapasitas</th>
              <th>Fasilitas</th>
              <th>Status</th>
              <th className="cell-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>
                  <span className="cell-strong mono">{room.code}</span>
                </td>
                <td>
                  <span className="cell-strong">{room.name}</span>
                  <span className="cell-sub">
                    {room.building} · Lt. {room.floor}
                  </span>
                </td>
                <td className="num">{room.capacity} orang</td>
                <td>{room.facilities.length} fasilitas</td>
                <td>
                  <span className={`pill ${room.status === "aktif" ? "pill-disetujui" : "pill-dibatalkan"}`}>
                    {room.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="cell-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(room)}>
                    Ubah
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="record-list">
        {rooms.map((room) => (
          <article className="record" key={room.id}>
            <div className="record-top">
              <div>
                <span className="record-code">{room.code}</span>
                <h3>{room.name}</h3>
              </div>
              <span className={`pill ${room.status === "aktif" ? "pill-disetujui" : "pill-dibatalkan"}`}>
                {room.status === "aktif" ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="record-meta">
              <span>
                {room.building} · Lt. {room.floor}
              </span>
              <span>{room.capacity} orang</span>
              <span>{room.facilities.length} fasilitas</span>
            </div>
            <div className="record-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(room)}>
                Ubah data
              </button>
            </div>
          </article>
        ))}
      </div>

      <p className="tiny muted" style={{ marginTop: "var(--space-s)" }}>
        Menonaktifkan ruang akan menyembunyikannya dari daftar pengajuan, tetapi reservasi yang sudah ada tetap tersimpan.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Ubah data ruang" : "Tambah ruang"}
        subtitle={form.id ? `${form.code} · ${form.name}` : "Ruang baru langsung tersedia pada daftar pengajuan."}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? "Menyimpan…" : form.id ? "Simpan perubahan" : "Tambah ruang"}
            </button>
          </>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          noValidate
          style={{ display: "grid", gap: "var(--space-s)" }}
        >
          <div className="field" data-invalid={fieldErrors.name ? "true" : undefined}>
            <label htmlFor="rm-name">
              Nama ruangan <span className="req">*</span>
            </label>
            <input
              className="input"
              id="rm-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Contoh: Studio Animasi"
              data-autofocus
            />
            <p className="field-error">{fieldErrors.name}</p>
          </div>

          <div className="form-grid cols-2">
            <div className="field" data-invalid={fieldErrors.code ? "true" : undefined}>
              <label htmlFor="rm-code">
                Kode <span className="req">*</span>
              </label>
              <input
                className="input mono"
                id="rm-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                placeholder="D-01"
              />
              <p className="field-error">{fieldErrors.code}</p>
            </div>
            <div className="field" data-invalid={fieldErrors.capacity ? "true" : undefined}>
              <label htmlFor="rm-capacity">
                Kapasitas <span className="req">*</span>
              </label>
              <input
                className="input"
                id="rm-capacity"
                inputMode="numeric"
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: event.target.value.replace(/[^\d]/g, "") })}
                placeholder="30"
              />
              <p className="field-error">{fieldErrors.capacity}</p>
            </div>
          </div>

          <div className="form-grid cols-3">
            <div className="field" data-invalid={fieldErrors.building ? "true" : undefined}>
              <label htmlFor="rm-building">Gedung</label>
              <input
                className="input"
                id="rm-building"
                value={form.building}
                onChange={(event) => setForm({ ...form, building: event.target.value })}
              />
              <p className="field-error">{fieldErrors.building}</p>
            </div>
            <div className="field" data-invalid={fieldErrors.floor ? "true" : undefined}>
              <label htmlFor="rm-floor">Lantai</label>
              <input
                className="input"
                id="rm-floor"
                inputMode="numeric"
                value={form.floor}
                onChange={(event) => setForm({ ...form, floor: event.target.value.replace(/[^\d]/g, "") })}
              />
              <p className="field-error">{fieldErrors.floor}</p>
            </div>
            <div className="field">
              <label htmlFor="rm-status">Status</label>
              <select
                className="select"
                id="rm-status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as RoomStatus })}
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Fasilitas</span>
            <div className="chips" role="group" aria-label="Fasilitas ruang">
              {facilities.map((facility) => {
                const selected = form.facilities.includes(facility);
                return (
                  <label key={facility} className="chip">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleFacility(facility)}
                    />
                    {facility}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="rm-note">Catatan ruang</label>
            <textarea
              className="textarea"
              id="rm-note"
              rows={2}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </div>

          {error ? (
            <div className="notice notice-bad">
              <Icon name="alert" />
              <div>{error}</div>
            </div>
          ) : null}

          <p className="tiny muted">
            Diubah oleh {viewer.fullName}. Perubahan dicatat pada jejak audit.
          </p>
        </form>
      </Modal>
    </>
  );
}

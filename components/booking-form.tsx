"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { TimeOptions } from "@/components/time-options";
import { createReservationAction, fetchBookingsAction } from "@/app/actions/reservations";
import { validateReservation } from "@/lib/validation";
import { addDaysISO, durationLabel, fmtDate, nextBookableDay, timeLabel, toMinutes, todayISO } from "@/lib/format";
import { overlaps } from "@/lib/slots";
import type { BookingSummary, Category, ReservationInput, Room, SessionUser, Settings } from "@/lib/types";

const CATEGORIES: Category[] = ["Akademik", "Organisasi", "Seminar", "Lomba", "Lainnya"];

interface InitialValues {
  roomId?: string;
  date?: string;
  start?: string;
  end?: string;
  participants?: string;
}

export function BookingForm({
  user,
  rooms,
  settings,
  initial,
}: {
  user: SessionUser;
  rooms: Room[];
  settings: Settings;
  initial: InitialValues;
}) {
  const router = useRouter();
  const today = todayISO();
  const firstAvailable = nextBookableDay(today);
  const initialDate = initial.date || firstAvailable;
  const normalizedInitialDate = nextBookableDay(initialDate);
  const [form, setForm] = useState<ReservationInput>({
    activity: "",
    category: "Akademik",
    roomId: initial.roomId && rooms.some((r) => r.id === initial.roomId) ? initial.roomId : rooms[0]?.id ?? "",
    date: normalizedInitialDate,
    start: initial.start || "",
    end: initial.end || "",
    participants: initial.participants || "",
    contact: "",
    purpose: "",
    note: "",
  });
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [dateNotice, setDateNotice] = useState(
    normalizedInitialDate !== initialDate
      ? `Minggu libur. Tanggal dialihkan ke ${fmtDate(normalizedInitialDate, { weekday: true, short: true })}.`
      : "",
  );

  const room = rooms.find((r) => r.id === form.roomId) ?? null;
  const conflicts = useMemo(
    () => (form.start && form.end ? bookings.filter((booking) => overlaps(form.start, form.end, booking)) : []),
    [bookings, form.start, form.end],
  );
  const minutes = form.start && form.end ? toMinutes(form.end) - toMinutes(form.start) : 0;

  useEffect(() => {
    if (!form.roomId || !form.date) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const result = await fetchBookingsAction(form.roomId, form.date);
      if (!active) return;
      if (result.ok) {
        setBookings(result.data.bookings);
        setNotice("");
      } else {
        setBookings([]);
        setNotice(result.message);
      }
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.roomId, form.date]);

  function update<K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setServerError("");
  }

  function changeDate(value: string) {
    const nextDate = nextBookableDay(value);
    update("date", nextDate);
    setDateNotice(
      nextDate !== value
        ? `Minggu libur. Tanggal dialihkan ke ${fmtDate(nextDate, { weekday: true, short: true })}.`
        : "",
    );
  }

  function validateNow() {
    const result = validateReservation(
      form,
      settings,
      room,
      conflicts.map((booking) => ({ code: booking.code, start: booking.start, end: booking.end })),
    );
    setErrors(result.fieldErrors);
    return result;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setServerError("");
    const local = validateNow();
    if (!local.ok) {
      const first = Object.keys(local.fieldErrors)[0];
      const target = document.querySelector<HTMLElement>(`[name="${first}"]`);
      target?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await createReservationAction(form);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setServerError(result.message);
        return;
      }
      router.push(`/reservasi/sukses/${result.data.id}`);
    } catch {
      setServerError("Pengajuan tidak dapat dikirim karena gangguan koneksi. Data Anda masih tersimpan di formulir — coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const summaryStatus = !form.start || !form.end
    ? { className: "pill pill-menunggu", text: "Menunggu pemeriksaan jadwal" }
    : conflicts.length
      ? { className: "pill pill-ditolak", text: "Jadwal bentrok" }
      : minutes <= 0
        ? { className: "pill pill-menunggu", text: "Waktu belum valid" }
        : { className: "pill pill-disetujui", text: "Ruang tersedia" };

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Pengajuan baru</p>
          <h1>Ajukan reservasi ruang</h1>
          <p className="page-subtitle">
            {settings.autoApprove ? (
              <>
                Pengajuan akan otomatis <strong>Disetujui</strong> bila jadwal kosong, sesuai pengaturan kampus.
              </>
            ) : (
              <>
                Pengajuan akan berstatus <strong>Menunggu</strong> sampai admin reservasi memutuskan. Pastikan detail
                kegiatan dan waktu sudah sesuai sebelum dikirim.
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/reservasi">
            <Icon name="list" /> Peminjaman Saya
          </Link>
        </div>
      </div>

      <h2 className="sr-only">Formulir pengajuan reservasi</h2>
      {serverError ? (
        <div className="notice notice-bad" role="alert" style={{ marginBottom: "var(--space-m)" }}>
          <Icon name="alert" />
          <div>
            <strong>Pengajuan belum tersimpan.</strong>
            <span>{serverError}</span>
          </div>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div className="notice notice-bad" role="alert" style={{ marginBottom: "var(--space-m)" }}>
          <Icon name="alert" />
          <div>
            <strong>Ada isian yang perlu diperbaiki.</strong>
            <span>{Object.values(errors).filter(Boolean).slice(0, 2).join(" ")}</span>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate>
        <div className="split split-form" style={{ alignItems: "start" }}>
          <div className="panel" style={{ display: "grid", gap: "var(--space-m)" }}>
            <div>
              <div className="panel-head">
                <h3>Detail kegiatan</h3>
                <span className="badge">1 dari 2</span>
              </div>
              <div className="form-grid">
                <div className="field" data-invalid={errors.activity ? "true" : undefined}>
                  <label htmlFor="r-activity">
                    Nama kegiatan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="r-activity"
                    name="activity"
                    maxLength={90}
                    placeholder="Contoh: Rapat Himpunan Mahasiswa DKV"
                    value={form.activity}
                    onChange={(event) => update("activity", event.target.value)}
                    onBlur={() => form.activity.trim() && validateNow()}
                  />
                  <p className="field-hint">Tuliskan nama yang dikenali peserta, 4–90 karakter.</p>
                  <p className="field-error">{errors.activity}</p>
                </div>

                <div className="field" data-invalid={errors.category ? "true" : undefined}>
                  <label htmlFor="r-category">
                    Jenis kegiatan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <select
                    className="select"
                    id="r-category"
                    name="category"
                    value={form.category}
                    onChange={(event) => update("category", event.target.value as Category)}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <p className="field-error">{errors.category}</p>
                </div>

                <div className="form-grid cols-2">
                  <div className="field" data-invalid={errors.participants ? "true" : undefined}>
                    <label htmlFor="r-participants">
                      Jumlah peserta <span className="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      className="input"
                      id="r-participants"
                      name="participants"
                      type="text"
                      inputMode="numeric"
                      placeholder="Contoh: 30"
                      value={form.participants}
                      onChange={(event) => update("participants", event.target.value.replace(/[^\d]/g, ""))}
                      onBlur={() => form.participants && validateNow()}
                    />
                    <p className="field-hint">
                      {room ? `Maksimal ${room.capacity} orang untuk ${room.name}.` : "Sesuaikan dengan kapasitas ruang."}
                    </p>
                    <p className="field-error">{errors.participants}</p>
                  </div>

                  <div className="field" data-invalid={errors.contact ? "true" : undefined}>
                    <label htmlFor="r-contact">Kontak pemohon</label>
                    <input
                      className="input"
                      id="r-contact"
                      name="contact"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0812-3456-7890"
                      value={form.contact}
                      onChange={(event) => update("contact", event.target.value)}
                      onBlur={() => form.contact && validateNow()}
                    />
                    <p className="field-hint">Opsional, dipakai admin bila perlu konfirmasi.</p>
                    <p className="field-error">{errors.contact}</p>
                  </div>
                </div>

                <div className="field" data-invalid={errors.purpose ? "true" : undefined}>
                  <label htmlFor="r-purpose">
                    Tujuan peminjaman <span className="req" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="r-purpose"
                    name="purpose"
                    rows={3}
                    maxLength={300}
                    placeholder="Jelaskan tujuan penggunaan ruangan, misalnya: rapat koordinasi kepanitiaan dan persiapan pameran."
                    value={form.purpose}
                    onChange={(event) => update("purpose", event.target.value)}
                    onBlur={() => form.purpose.trim() && validateNow()}
                  />
                  <p className="field-hint">Tercantum pada surat peminjaman. {form.purpose.length}/300 karakter</p>
                  <p className="field-error">{errors.purpose}</p>
                </div>

                <div className="field" data-invalid={errors.note ? "true" : undefined}>
                  <label htmlFor="r-note">Keterangan tambahan</label>
                  <textarea
                    className="textarea"
                    id="r-note"
                    name="note"
                    maxLength={300}
                    placeholder="Kebutuhan khusus, peralatan tambahan, atau susunan acara singkat."
                    value={form.note}
                    onChange={(event) => update("note", event.target.value)}
                  />
                  <p className="field-hint">{form.note.length}/300 karakter</p>
                  <p className="field-error">{errors.note}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-head">
                <h3>Ruang dan waktu</h3>
                <span className="badge">2 dari 2</span>
              </div>
              <div className="form-grid">
                <div className="field" data-invalid={errors.roomId ? "true" : undefined}>
                  <label htmlFor="r-room">
                    Ruangan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <select
                    className="select"
                    id="r-room"
                    name="roomId"
                    value={form.roomId}
                    onChange={(event) => update("roomId", event.target.value)}
                  >
                    {rooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.code} · {item.capacity} orang
                      </option>
                    ))}
                  </select>
                  <p className="field-error">{errors.roomId}</p>
                </div>

                <div className="form-grid cols-3">
                  <div className="field" data-invalid={errors.date ? "true" : undefined}>
                    <label htmlFor="r-date">
                      Tanggal <span className="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      className="input"
                      id="r-date"
                      name="date"
                      type="date"
                      value={form.date}
                      min={firstAvailable}
                      max={addDaysISO(today, settings.windowDays)}
                      onChange={(event) => changeDate(event.target.value)}
                    />
                    <p className="field-hint">
                      {dateNotice || "Pemesanan hanya tersedia Senin–Sabtu. Minggu libur."}
                    </p>
                    <p className="field-error">{errors.date}</p>
                  </div>
                  <div className="field" data-invalid={errors.start ? "true" : undefined}>
                    <label htmlFor="r-start">
                      Waktu mulai <span className="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      className="select"
                      id="r-start"
                      name="start"
                      value={form.start}
                      onChange={(event) => update("start", event.target.value)}
                    >
                      <option value="">Pilih</option>
                      <TimeOptions settings={settings} />
                    </select>
                    <p className="field-error">{errors.start}</p>
                  </div>
                  <div className="field" data-invalid={errors.end ? "true" : undefined}>
                    <label htmlFor="r-end">
                      Waktu selesai <span className="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      className="select"
                      id="r-end"
                      name="end"
                      value={form.end}
                      onChange={(event) => update("end", event.target.value)}
                    >
                      <option value="">Pilih</option>
                      <TimeOptions settings={settings} />
                    </select>
                    <p className="field-error">{errors.end}</p>
                  </div>
                </div>

                <div
                  className={`notice ${
                    !form.start || !form.end
                      ? "notice-info"
                      : conflicts.length
                        ? "notice-bad"
                        : "notice-ok"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <Icon name={conflicts.length ? "alert" : "calendar"} />
                  <div>
                    <strong>{conflicts.length ? "Jadwal bentrok" : form.start && form.end ? "Ruang tersedia" : "Periksa ketersediaan"}</strong>
                    <span>
                      {notice ||
                        (!form.start || !form.end
                          ? "Lengkapi ruang, tanggal, dan waktu untuk memeriksa bentrok jadwal."
                          : conflicts.length
                            ? `Bentrok dengan ${conflicts[0].code} (${timeLabel(conflicts[0].start)}–${timeLabel(conflicts[0].end)}). Pilih waktu atau ruang lain.`
                            : `Ruang tersedia pada ${fmtDate(form.date, { weekday: true, short: true })}, ${timeLabel(form.start)}–${timeLabel(form.end)}.`)}
                    </span>
                  </div>
                </div>

                <p className="tiny muted">
                  {bookings.length
                    ? `Agenda lain pada tanggal ini: ${bookings
                        .map((booking) => `${timeLabel(booking.start)}–${timeLabel(booking.end)} (${booking.activity})`)
                        .join(" · ")}`
                    : room
                      ? `Belum ada agenda lain di ${room.name} pada tanggal ini.`
                      : ""}
                </p>
              </div>
            </div>
          </div>

          <aside className="summary-card" aria-label="Ringkasan pengajuan">
            <p className="eyebrow" style={{ fontSize: 10 }}>
              Ringkasan
            </p>
            <div className="summary-room">
              <div className="plate" aria-hidden="true">
                {room?.code ?? "—"}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 15 }}>{room?.name ?? "—"}</h3>
                <p className="tiny muted">
                  {room ? `${room.code} · ${room.building} · ${room.capacity} orang` : ""}
                </p>
              </div>
            </div>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Kegiatan</span>
                <span>{form.activity.trim() ? `${form.activity.trim().slice(0, 40)}${form.activity.length > 40 ? "…" : ""}` : "—"}</span>
              </div>
              <div className="summary-row">
                <span>Tanggal</span>
                <span>{fmtDate(form.date, { short: true })}</span>
              </div>
              <div className="summary-row">
                <span>Waktu</span>
                <span>{form.start && form.end ? `${timeLabel(form.start)}–${timeLabel(form.end)}` : "—"}</span>
              </div>
              <div className="summary-row">
                <span>Durasi</span>
                <span>{minutes > 0 ? durationLabel(minutes) : "—"}</span>
              </div>
              <div className="summary-row">
                <span>Peserta</span>
                <span>{form.participants ? `${form.participants} orang` : "—"}</span>
              </div>
              <div className="summary-row">
                <span>Tujuan</span>
                <span>{form.purpose.trim() ? `${form.purpose.trim().slice(0, 46)}${form.purpose.length > 46 ? "…" : ""}` : "—"}</span>
              </div>
            </div>
            <span className={summaryStatus.className} style={{ justifySelf: "start" }}>
              {summaryStatus.text}
            </span>
            <div className="summary-total">
              <span>Status setelah dikirim</span>
              <span>{settings.autoApprove ? "Disetujui otomatis" : "Menunggu"}</span>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Kirim pengajuan"} {busy ? null : <Icon name="arrowRight" />}
            </button>
            <Link className="btn btn-ghost btn-block" href="/reservasi">
              Batal
            </Link>
            <p className="tiny muted">
              Dengan mengirim, Anda menyatakan data yang diisi benar. Pengajuan dapat dibatalkan sesuai kebijakan.
            </p>
            <p className="tiny muted">
              Pemohon: {user.fullName} · {user.email}
            </p>
            <Link className="link-arrow" href="/ruang">
              Kembali ke daftar ruang <Icon name="arrowRight" />
            </Link>
          </aside>
        </div>
      </form>
    </div>
  );
}

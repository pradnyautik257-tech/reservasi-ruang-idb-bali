import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getBookings, getRoomById, getSettings } from "@/lib/data";
import { addDaysISO, fmtDate, nextBookableDay, timeLabel, todayISO, toMinutes } from "@/lib/format";
import { overlaps, nextFreeSlots } from "@/lib/slots";
import { roomImage, roomImageAlt } from "@/lib/room-images";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";
import { TimeOptions } from "@/components/time-options";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const room = await getRoomById(id);
  return { title: room ? room.name : "Detail Ruangan" };
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const settings = await getSettings();
  const room = await getRoomById(id);
  if (!room) notFound();

  const today = todayISO();
  const firstAvailable = nextBookableDay(today);
  const requestedDate = single(query.tanggal) || firstAvailable;
  const date = nextBookableDay(requestedDate);
  const start = single(query.mulai) || "";
  const end = single(query.selesai) || "";
  const validWindow = Boolean(start && end && toMinutes(end) > toMinutes(start));
  const bookings = await getBookings(room.id, date);
  const conflict = validWindow ? bookings.find((booking) => overlaps(start, end, booking)) : undefined;
  const free = validWindow ? !conflict : bookings.length === 0;
  const now = new Date();
  const afterMinutes = date === today ? now.getHours() * 60 + now.getMinutes() : 0;
  const nextSlots = nextFreeSlots(bookings, settings, 4, undefined, afterMinutes);
  const canBook = (user.role === "mahasiswa" || user.role === "dosen") && room.status === "aktif";

  const bookingParams = new URLSearchParams({ room: room.id, tanggal: date });
  if (validWindow && !conflict) {
    bookingParams.set("mulai", start);
    bookingParams.set("selesai", end);
  } else if (nextSlots[0]) {
    bookingParams.set("mulai", nextSlots[0].start);
    bookingParams.set("selesai", nextSlots[0].end);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Detail ruangan</p>
          <div className="page-title">
            <h1>{room.name}</h1>
            {room.status === "aktif" ? <span className="pill pill-disetujui">Aktif</span> : <span className="pill pill-dibatalkan">Nonaktif</span>}
          </div>
          <p className="page-subtitle">{room.building} · Lantai {room.floor} · Kapasitas {room.capacity} orang</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/ruang">
            <Icon name="arrowRight" className="icon-flip" /> Kembali
          </Link>
          {canBook ? (
            <Link className="btn btn-primary" href={`/reservasi/baru?${bookingParams.toString()}`}>
              <Icon name="plus" /> Ajukan Peminjaman
            </Link>
          ) : null}
        </div>
      </div>

      {room.status !== "aktif" ? (
        <div className="notice notice-warn" style={{ marginBottom: 18 }}>
          <Icon name="alert" />
          <div>
            <strong>Ruangan sedang nonaktif.</strong>
            <span>Ruangan ini tidak dapat dipinjam sampai admin mengaktifkannya kembali.</span>
          </div>
        </div>
      ) : null}

      <div className="room-detail-grid">
        <div>
          <div className="room-detail-media">
            <Image src={roomImage(room)} alt={roomImageAlt(room)} fill sizes="(max-width: 1100px) 100vw, 60vw" priority />
            <span className={`room-availability ${free ? "is-free" : "is-booked"}`}>
              <span className="dot" />
              {validWindow ? (free ? "Tersedia pada waktu dipilih" : "Tidak tersedia pada waktu dipilih") : free ? "Tersedia hari ini" : "Ada agenda pada tanggal ini"}
            </span>
            <span className="room-code">{room.code}</span>
          </div>

          <section className="detail-section">
            <h2>Tentang ruangan</h2>
            <p className="detail-description">{room.note || "Belum ada deskripsi ruangan. Hubungi admin reservasi untuk informasi lebih lanjut."}</p>
            <div className="detail-facts">
              <div className="detail-fact">
                <span>Kapasitas maksimum</span>
                <strong>{room.capacity} orang</strong>
              </div>
              <div className="detail-fact">
                <span>Lokasi</span>
                <strong>{room.building}, Lt. {room.floor}</strong>
              </div>
              <div className="detail-fact">
                <span>Kode ruang</span>
                <strong className="mono">{room.code}</strong>
              </div>
            </div>
            <div className="section-divider" />
            <h3 style={{ fontSize: 13 }}>Fasilitas</h3>
            <div className="facility-list" style={{ marginTop: 9 }}>
              {room.facilities.length ? room.facilities.map((facility) => (
                <span className="facility-chip" key={facility}>{facility}</span>
              )) : <span className="tiny muted">Belum ada data fasilitas.</span>}
            </div>
          </section>

          <section className="detail-section">
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <div>
                <h2>Jadwal penggunaan</h2>
                <p>{fmtDate(date, { weekday: true })} · {bookings.length} agenda aktif</p>
              </div>
              <span className="badge">{bookings.length ? "Perlu diperhatikan" : "Kosong"}</span>
            </div>
            {bookings.length ? (
              <div className="slot-list">
                {bookings.map((booking) => (
                  <div className={`slot-item ${booking.status === "disetujui" ? "is-approved" : "is-pending"}`} key={booking.id}>
                    <time>{timeLabel(booking.start)}–{timeLabel(booking.end)}</time>
                    <span className="grow">
                      <strong>{booking.activity}</strong>
                      <small className="mono">{booking.code}</small>
                    </span>
                    <StatusPill status={booking.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "26px 16px" }}>
                <div className="empty-icon"><Icon name="calendar" /></div>
                <h3>Belum ada agenda</h3>
                <p>Ruangan ini belum digunakan pada tanggal yang dipilih.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="booking-sidebar">
          <div className="booking-summary">
            <p className="eyebrow">Cek ketersediaan</p>
            <h3 style={{ marginTop: 4 }}>Pilih tanggal dan waktu</h3>
            <p className="tiny muted" style={{ marginTop: 5 }}>
              Sistem akan memeriksa jadwal yang sudah disetujui maupun yang masih menunggu.
            </p>
            <form action={`/ruang/${room.id}`} method="get" style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <div className="field">
                <label htmlFor="detail-date">Tanggal</label>
                <input
                  className="input"
                  id="detail-date"
                  type="date"
                  name="tanggal"
                  defaultValue={date}
                  min={today}
                  max={addDaysISO(today, settings.windowDays)}
                />
              </div>
              <div className="form-grid cols-2" style={{ gap: 9 }}>
                <div className="field">
                  <label htmlFor="detail-start">Mulai</label>
                  <select className="select" id="detail-start" name="mulai" defaultValue={start}>
                    <TimeOptions settings={settings} allowEmpty placeholder="Pilih" />
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="detail-end">Selesai</label>
                  <select className="select" id="detail-end" name="selesai" defaultValue={end}>
                    <TimeOptions settings={settings} allowEmpty placeholder="Pilih" />
                  </select>
                </div>
              </div>
              <button className="btn btn-ghost btn-block" type="submit">
                <Icon name="search" /> Periksa Ketersediaan
              </button>
            </form>

            {start || end ? (
              <div className={`notice ${validWindow ? (conflict ? "notice-bad" : "notice-ok") : "notice-warn"}`} style={{ marginTop: 14 }} role="status">
                <Icon name={conflict ? "alert" : validWindow ? "check" : "info"} />
                <div>
                  <strong>
                    {!validWindow ? "Waktu belum valid" : conflict ? "Jadwal bentrok" : "Ruang tersedia"}
                  </strong>
                  <span>
                    {!validWindow
                      ? "Pilih waktu mulai dan selesai yang benar."
                      : conflict
                        ? `Bertabrakan dengan ${conflict.code} (${timeLabel(conflict.start)}–${timeLabel(conflict.end)}) yang berstatus ${conflict.status === "disetujui" ? "disetujui" : "menunggu"}.`
                        : `${fmtDate(date, { weekday: true, short: true })}, ${timeLabel(start)}–${timeLabel(end)}.`}
                  </span>
                </div>
              </div>
            ) : null}

            {canBook ? (
              <Link className="btn btn-primary btn-block" href={`/reservasi/baru?${bookingParams.toString()}`} style={{ marginTop: 14 }}>
                <Icon name="plus" /> Ajukan Peminjaman
              </Link>
            ) : null}
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Pengajuan tetap diperiksa ulang oleh server saat dikirim.
            </p>
          </div>

          <div className="booking-summary">
            <div className="panel-head" style={{ marginBottom: 8 }}>
              <div>
                <p className="eyebrow">Slot kosong</p>
                <h3 style={{ marginTop: 3 }}>Pilihan waktu berikutnya</h3>
              </div>
            </div>
            {nextSlots.length ? (
              <div className="slot-list">
                {nextSlots.map((slot) => (
                  <Link
                    className="slot-item is-approved"
                    key={slot.start}
                    href={`/reservasi/baru?${new URLSearchParams({ room: room.id, tanggal: date, mulai: slot.start, selesai: slot.end }).toString()}`}
                  >
                    <time>{timeLabel(slot.start)}–{timeLabel(slot.end)}</time>
                    <span className="grow"><strong>Gunakan slot ini</strong><small>{fmtDate(date, { short: true })}</small></span>
                    <Icon name="arrowRight" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="tiny muted">Tidak ada slot kosong pada tanggal ini. Coba tanggal lain.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getBookings, getFacilityNames, getRooms, getSettings } from "@/lib/data";
import { addDaysISO, fmtDate, nextBookableDay, todayISO } from "@/lib/format";
import { overlaps } from "@/lib/slots";
import { FacilityCheckboxes } from "@/components/facility-checkboxes";
import { Icon } from "@/components/icons";
import { RoomCard } from "@/components/room-card";
import { TimeOptions } from "@/components/time-options";

export const metadata: Metadata = { title: "Daftar Ruangan" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RoomsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = await getSettings();
  const today = todayISO();
  const firstAvailable = nextBookableDay(today);

  const requestedDate = single(params.tanggal) || firstAvailable;
  const date = nextBookableDay(requestedDate);
  const dateAdjusted = date !== requestedDate;
  const tomorrow = nextBookableDay(addDaysISO(today, 1));
  const start = single(params.mulai) || "";
  const end = single(params.selesai) || "";
  const capacity = Number(single(params.kapasitas)) || 0;
  const query = (single(params.q) || "").trim();
  const selectedFacilities = (
    Array.isArray(params.fasilitas) ? params.fasilitas : params.fasilitas ? [params.fasilitas] : []
  ).filter(Boolean);
  const timeSelected = Boolean(start && end);

  const allRooms = await getRooms();
  const facilities = await getFacilityNames();

  const matching = allRooms.filter((room) => {
    if (capacity && room.capacity < capacity) return false;
    if (selectedFacilities.length && !selectedFacilities.every((facility) => room.facilities.includes(facility))) return false;
    if (query) {
      const haystack = `${room.name} ${room.code} ${room.building}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const bookingsByRoom = new Map(
    await Promise.all(matching.map(async (room) => [room.id, await getBookings(room.id, date)] as const)),
  );

  const visible = matching.filter((room) => {
    if (!timeSelected) return true;
    const bookings = bookingsByRoom.get(room.id) ?? [];
    return !bookings.some((booking) => overlaps(start, end, booking));
  });

  const canBook = user.role === "mahasiswa" || user.role === "dosen";
  const hasFilter = Boolean(
    query || capacity || selectedFacilities.length || start || end || date !== firstAvailable,
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Ruang kampus</p>
          <h1>Daftar Ruangan</h1>
          <p className="page-subtitle">
            Temukan ruang yang sesuai dengan kebutuhan kegiatan. Pilih tanggal dan waktu untuk melihat ketersediaan
            yang sudah disesuaikan dengan jadwal peminjaman.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/jadwal">
            <Icon name="calendar" /> Jadwal Ruangan
          </Link>
          {canBook ? (
            <Link className="btn btn-primary" href="/reservasi/baru">
              <Icon name="plus" /> Ajukan Peminjaman
            </Link>
          ) : null}
        </div>
      </div>

      <section className="filters" aria-label="Filter ruangan">
        <div className="filter-head">
          <strong>Cari dan filter ruangan</strong>
          <span className="tiny muted">Tanggal acuan: {fmtDate(date, { weekday: true, short: true })}</span>
        </div>
        <form action="/ruang" method="get">
          <div className="form-grid cols-3">
            <div className="field">
              <label htmlFor="f-q">Nama, kode, atau gedung</label>
              <div className="filter-search">
                <Icon name="search" />
                <input
                  className="input"
                  type="search"
                  id="f-q"
                  name="q"
                  defaultValue={query}
                  placeholder="Contoh: Aula, studio, Gedung B"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-date">Tanggal</label>
              <input
                className="input"
                type="date"
                id="f-date"
                name="tanggal"
                defaultValue={date}
                min={firstAvailable}
                max={addDaysISO(today, settings.windowDays)}
              />
              <p className="field-hint">Filter tanggal hanya tersedia Senin–Sabtu. Minggu otomatis dialihkan ke Senin.</p>
            </div>
            <div className="field">
              <label htmlFor="f-cap">Kapasitas minimum</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                id="f-cap"
                name="kapasitas"
                defaultValue={capacity || ""}
                placeholder="Contoh: 30"
              />
            </div>
            <div className="field">
              <label htmlFor="f-start">Waktu mulai</label>
              <select className="select" id="f-start" name="mulai" defaultValue={start}>
                <TimeOptions settings={settings} allowEmpty placeholder="Semua waktu" />
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-end">Waktu selesai</label>
              <select className="select" id="f-end" name="selesai" defaultValue={end}>
                <TimeOptions settings={settings} allowEmpty placeholder="Semua waktu" />
              </select>
            </div>
            <div className="field">
              <span className="field-label">Fasilitas</span>
              <div className="facility-filter">
                <FacilityCheckboxes facilities={facilities} selected={selectedFacilities} />
              </div>
            </div>
          </div>
          <div className="filter-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" type="submit">
              <Icon name="filter" /> Terapkan Filter
            </button>
            {hasFilter ? (
              <Link className="btn btn-ghost" href="/ruang">Atur Ulang</Link>
            ) : null}
            <span className="grow" />
            <span className="tiny muted">
              {timeSelected
                ? "Ruangan yang bentrok dengan jadwal aktif disembunyikan."
                : "Tanpa filter waktu, semua ruang ditampilkan beserta ringkasan agendanya."}
            </span>
          </div>
        </form>
      </section>

      {dateAdjusted ? (
        <div className="notice notice-info" role="status" style={{ marginTop: 16 }}>
          <Icon name="info" />
          <div>
            <strong>Minggu libur.</strong>
            <span>
              Filter ruangan hanya dapat digunakan Senin–Sabtu. Tanggal dialihkan ke{" "}
              {fmtDate(date, { weekday: true })}.
            </span>
          </div>
        </div>
      ) : null}

      <div className="filter-summary">
        <span>
          Menampilkan <strong>{visible.length}</strong> dari {allRooms.length} ruang aktif
        </span>
        <div className="quick-filters">
          <Link className={`quick-filter${date === firstAvailable && !hasFilter ? " is-active" : ""}`} href="/ruang">
            {firstAvailable === today ? "Hari ini" : fmtDate(firstAvailable, { weekday: true })}
          </Link>
          <Link className={`quick-filter${date === tomorrow ? " is-active" : ""}`} href={`/ruang?tanggal=${tomorrow}`}>
            {tomorrow === addDaysISO(today, 1) ? "Besok" : fmtDate(tomorrow, { weekday: true })}
          </Link>
          <Link className="quick-filter" href="/jadwal">Lihat kalender</Link>
        </div>
      </div>

      {visible.length ? (
        <div className="room-grid">
          {visible.map((room) => {
            const bookings = bookingsByRoom.get(room.id) ?? [];
            const free = timeSelected ? !bookings.some((booking) => overlaps(start, end, booking)) : bookings.length === 0;
            return (
              <RoomCard
                key={room.id}
                room={room}
                date={date}
                bookings={bookings}
                settings={settings}
                free={free}
                timeSelected={timeSelected}
                canBook={canBook}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 18 }}>
          <div className="empty-icon"><Icon name="search" /></div>
          <h3>Tidak ada ruang yang sesuai</h3>
          <p>
            Coba longgarkan kapasitas atau fasilitas, pilih waktu lain, atau tampilkan seluruh ruang untuk melihat
            pilihan yang tersedia.
          </p>
          <Link className="btn btn-primary" href="/ruang">Tampilkan Semua Ruang</Link>
        </div>
      )}
    </>
  );
}

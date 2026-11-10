"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { StatusPill } from "@/components/status-pill";
import { TimeOptions } from "@/components/time-options";
import { DemoBookingForm, type DemoBookingSeed } from "@/components/demo-booking-form";
import { roomImage, roomImageAlt } from "@/lib/room-images";
import {
  addDaysISO,
  fmtDate,
  fmtDateShort,
  fmtDateTime,
  nextBookableDay,
  parseDateISO,
  roleLabel,
  timeLabel,
  todayISO,
} from "@/lib/format";
import { nextFreeSlots, overlaps } from "@/lib/slots";
import {
  DEMO_ACCOUNTS,
  DEMO_RESERVATION_KEY,
  DEMO_ROOMS,
  DEMO_SETTINGS,
  cancelDemoReservation,
  decideDemoReservation,
  loadDemoReservations,
  readDemoUser,
  rememberDemoUser,
  resetDemoReservations,
  saveDemoReservations,
  type DemoMutationResult,
} from "@/lib/demo-store";
import type { Reservation, SessionUser } from "@/lib/types";

type DemoTab = "dashboard" | "rooms" | "booking" | "mine" | "schedule" | "queue" | "users" | "settings";
type NoticeTone = "ok" | "info" | "warn" | "bad";

interface DemoNotice {
  tone: NoticeTone;
  title: string;
  message: string;
}

interface DemoNavItem {
  tab: DemoTab;
  label: string;
  icon: string;
  badge?: number;
}

interface DemoDecisionTarget {
  reservation: Reservation;
  decision: "disetujui" | "ditolak";
}

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

function bySchedule(a: Reservation, b: Reservation) {
  return `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`);
}

function StatCard({
  icon,
  tone,
  value,
  label,
  detail,
}: {
  icon: string;
  tone?: "warn" | "ok" | "bad";
  value: number | string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon${tone ? ` is-${tone}` : ""}`}>
        <Icon name={icon} />
      </span>
      <div className="stat-meta">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {detail ? <span className="stat-detail">{detail}</span> : null}
      </div>
    </div>
  );
}

function DemoBoot() {
  return (
    <div className="demo-boot">
      <Image src="/idb-logo.png" width={90} height={60} alt="IDB Bali" priority />
      <div className="demo-boot-copy">
        <strong>Menyiapkan mode demo</strong>
        <span>Memuat data contoh dan reservasi dari localStorage…</span>
      </div>
    </div>
  );
}

function DemoLogin({ onSelect }: { onSelect: (account: SessionUser) => void }) {
  return (
    <div className="auth demo-auth">
      <aside className="auth-aside">
        <div className="auth-brand">
          <Image className="brand-logo" src="/idb-logo-light.png" width={58} height={39} alt="IDB Bali" priority />
          <div className="brand-text">
            <strong>IDB Bali</strong>
            <small>Reservasi Ruang Kampus</small>
          </div>
        </div>

        <div>
          <p className="eyebrow">Demo interaktif · Vercel ready</p>
          <h1>
            Reservasi ruang <em>tanpa database.</em>
          </h1>
          <p className="lead">
            Semua reservasi disimpan di browser ini. Coba ajukan peminjaman sebagai mahasiswa, lalu masuk sebagai
            admin untuk menyetujui atau menolak pengajuan yang sama.
          </p>
        </div>

        <div className="auth-points">
          <div className="auth-point">
            <Icon name="database" />
            <div>
              <strong>Tersimpan di localStorage</strong>
              <span>Data tetap ada saat halaman dimuat ulang atau akun diganti.</span>
            </div>
          </div>
          <div className="auth-point">
            <Icon name="users" />
            <div>
              <strong>Satu data untuk semua akun</strong>
              <span>Mahasiswa dan admin di browser yang sama melihat reservasi yang sama.</span>
            </div>
          </div>
          <div className="auth-point">
            <Icon name="refresh" />
            <div>
              <strong>Bisa direset kapan saja</strong>
              <span>Kembalikan data demo ke reservasi contoh dari kode.</span>
            </div>
          </div>
        </div>

        <div className="auth-foot">
          <div className="auth-campus">
            <strong>Institut Desain &amp; Bisnis Bali</strong>
            <span>Mode demo — tidak menggunakan database produksi.</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card demo-auth-card">
          <div>
            <p className="eyebrow">Mode demo</p>
            <h2>Pilih akun untuk masuk</h2>
            <p className="lead">
              Tidak perlu kata sandi. Akun dan data ruangan berasal dari data contoh di kode.
            </p>
          </div>

          <div className="demo-account-grid">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                className="demo-account-card"
                onClick={() => onSelect(account)}
              >
                <span className="avatar avatar-lg">{account.initials}</span>
                <span className="demo-account-copy">
                  <strong>{account.fullName}</strong>
                  <small>{account.email}</small>
                  <span className="demo-account-meta">
                    <span className="badge">{roleLabel(account.role)}</span>
                    <span>{account.identity ?? account.program}</span>
                  </span>
                </span>
                <Icon name="arrowRight" className="demo-account-arrow" />
              </button>
            ))}
          </div>

          <div className="notice notice-info">
            <Icon name="info" />
            <div>
              <strong>Data demo tersimpan di browser ini</strong>
              <span>
                Gunakan tombol “Reset data demo” di dalam aplikasi untuk menghapus seluruh perubahan dan kembali ke
                reservasi contoh.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DemoDashboard({
  user,
  reservations,
  onNavigate,
  onDetail,
}: {
  user: SessionUser;
  reservations: Reservation[];
  onNavigate: (tab: DemoTab) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const admin = user.role === "admin";
  const today = todayISO();
  const myReservations = reservations.filter((item) => item.userId === user.id);

  if (admin) {
    const pending = reservations.filter((item) => item.status === "menunggu");
    const approved = reservations.filter((item) => item.status === "disetujui");
    const rejected = reservations.filter((item) => item.status === "ditolak");
    const recent = [...reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

    return (
      <>
        <section className="greeting-banner">
          <div>
            <p className="eyebrow">Mode demo · {roleLabel(user.role)}</p>
            <h1>{greetingText()}, {firstName(user.fullName)}.</h1>
            <p>
              Tinjau pengajuan peminjaman, setujui atau tolak, lalu ganti akun untuk memastikan keputusan tersimpan
              di browser yang sama.
            </p>
          </div>
          <div className="greeting-actions">
            <button type="button" className="btn btn-primary" onClick={() => onNavigate("queue")}>
              <Icon name="list" /> Tinjau pengajuan
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onNavigate("schedule")}>
              <Icon name="calendar" /> Lihat jadwal
            </button>
          </div>
        </section>

        <div className="stats-grid" style={{ marginTop: 18 }}>
          <StatCard icon="clock" tone="warn" value={pending.length} label="Menunggu keputusan" detail="Perlu ditinjau admin" />
          <StatCard icon="check" tone="ok" value={approved.length} label="Disetujui" detail="Total data demo" />
          <StatCard icon="x" tone="bad" value={rejected.length} label="Ditolak" detail="Total data demo" />
          <StatCard icon="building" value={DEMO_ROOMS.length} label="Ruangan contoh" detail="Data tetap dari kode" />
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Pengajuan terbaru</h3>
                  <p>Data dari localStorage, termasuk perubahan status.</p>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onNavigate("queue")}>
                  Semua pengajuan <Icon name="arrowRight" />
                </button>
              </div>
              {recent.length ? (
                <div className="table-wrap">
                  <table className="table table-actions-sticky">
                    <thead>
                      <tr>
                        <th>Kegiatan</th>
                        <th>Pemohon</th>
                        <th>Jadwal</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="cell-strong">{item.activity}</span>
                            <span className="cell-sub">{item.code} · {item.room?.name}</span>
                          </td>
                          <td>
                            <span className="cell-strong">{item.user?.fullName}</span>
                            <span className="cell-sub">{roleLabel(item.user?.role ?? "")}</span>
                          </td>
                          <td>
                            <span className="cell-strong">{fmtDateShort(item.date)}</span>
                            <span className="cell-sub">{timeLabel(item.start)}–{timeLabel(item.end)}</span>
                          </td>
                          <td><StatusPill status={item.status} /></td>
                          <td className="cell-actions">
                            <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDetail(item)}>
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <span className="empty-icon"><Icon name="list" /></span>
                  <h3>Belum ada pengajuan</h3>
                  <p>Reservasi contoh akan muncul di sini.</p>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Jadwal hari ini</h3>
                  <p>{fmtDate(today, { weekday: true })}</p>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onNavigate("schedule")}>
                  Buka jadwal
                </button>
              </div>
              {reservations.filter((item) => item.date === today && item.status !== "dibatalkan").length ? (
                <div className="list-rows">
                  {reservations
                    .filter((item) => item.date === today && item.status !== "dibatalkan")
                    .sort(bySchedule)
                    .slice(0, 5)
                    .map((item) => (
                      <button
                        type="button"
                        className="list-row demo-list-button"
                        key={item.id}
                        onClick={() => onDetail(item)}
                      >
                        <span className="list-date">
                          <strong>{timeLabel(item.start).slice(0, 2)}</strong>
                          <span>{timeLabel(item.start).slice(3)}</span>
                        </span>
                        <span className="list-main">
                          <strong>{item.activity}</strong>
                          <span>{item.room?.name} · {timeLabel(item.start)}–{timeLabel(item.end)}</span>
                        </span>
                        <StatusPill status={item.status} />
                      </button>
                    ))}
                </div>
              ) : (
                <div className="empty">
                  <span className="empty-icon"><Icon name="calendar" /></span>
                  <h3>Tidak ada agenda hari ini</h3>
                  <p>Coba lihat jadwal minggu ini atau ajukan reservasi baru.</p>
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-stack">
            <section className="panel">
              <div className="panel-head"><h3>Akses cepat</h3></div>
              <div className="quick-actions">
                <button type="button" className="quick-action" onClick={() => onNavigate("queue")}>
                  <Icon name="clock" /> Tinjau pengajuan
                </button>
                <button type="button" className="quick-action" onClick={() => onNavigate("rooms")}>
                  <Icon name="building" /> Data ruangan
                </button>
                <button type="button" className="quick-action" onClick={() => onNavigate("users")}>
                  <Icon name="users" /> Data pengguna
                </button>
                <button type="button" className="quick-action" onClick={() => onNavigate("settings")}>
                  <Icon name="database" /> Data demo
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head"><h3>Info demo</h3></div>
              <div className="notice notice-info">
                <Icon name="info" />
                <div>
                  <strong>Perubahan tersimpan otomatis</strong>
                  <span>Setujui atau tolak pengajuan, lalu muat ulang halaman — statusnya tetap sama.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </>
    );
  }

  const pending = myReservations.filter((item) => item.status === "menunggu");
  const approved = myReservations.filter((item) => item.status === "disetujui");
  const upcoming = approved.filter((item) => item.date >= today).sort(bySchedule).slice(0, 4);
  const latest = [...myReservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <>
      <section className="greeting-banner">
        <div>
          <p className="eyebrow">Mode demo · {roleLabel(user.role)}</p>
          <h1>{greetingText()}, {firstName(user.fullName)}.</h1>
          <p>
            Ajukan peminjaman ruang, pantau status, lalu masuk sebagai admin untuk melihat bagaimana pengajuan
            diproses. Semua data tersimpan di browser ini.
          </p>
        </div>
        <div className="greeting-actions">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate("booking")}>
            <Icon name="plus" /> Ajukan peminjaman
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate("schedule")}>
            <Icon name="calendar" /> Lihat jadwal
          </button>
        </div>
      </section>

      <div className="stats-grid" style={{ marginTop: 18 }}>
        <StatCard icon="clock" tone="warn" value={pending.length} label="Menunggu" detail="Pengajuan Anda" />
        <StatCard icon="check" tone="ok" value={approved.length} label="Disetujui" detail="Siap digunakan" />
        <StatCard icon="list" value={myReservations.length} label="Total pengajuan" detail="Termasuk yang selesai" />
        <StatCard icon="building" value={DEMO_ROOMS.length} label="Ruangan tersedia" detail="Data contoh kampus" />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Peminjaman terbaru</h3>
                <p>Status terbaru dari data demo di browser ini.</p>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onNavigate("mine")}>
                Lihat semua <Icon name="arrowRight" />
              </button>
            </div>
            {latest.length ? (
              <div className="table-wrap">
                <table className="table table-actions-sticky">
                  <thead>
                    <tr>
                      <th>Kegiatan</th>
                      <th>Jadwal</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="cell-strong">{item.activity}</span>
                          <span className="cell-sub">{item.code} · {item.room?.name}</span>
                        </td>
                        <td>
                          <span className="cell-strong">{fmtDateShort(item.date)}</span>
                          <span className="cell-sub">{timeLabel(item.start)}–{timeLabel(item.end)}</span>
                        </td>
                        <td><StatusPill status={item.status} /></td>
                        <td className="cell-actions">
                          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDetail(item)}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <span className="empty-icon"><Icon name="calendar" /></span>
                <h3>Belum ada peminjaman</h3>
                <p>Mulai dengan mencari ruangan yang tersedia, lalu kirim pengajuan pertama Anda.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("booking")}>
                  <Icon name="plus" /> Ajukan sekarang
                </button>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Jadwal terdekat</h3>
                <p>Reservasi yang sudah disetujui.</p>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onNavigate("schedule")}>
                Jadwal lengkap
              </button>
            </div>
            {upcoming.length ? (
              <div className="list-rows">
                {upcoming.map((item) => (
                  <button
                    type="button"
                    className="list-row demo-list-button"
                    key={item.id}
                    onClick={() => onDetail(item)}
                  >
                    <span className="list-date">
                      <strong>{parseDateISO(item.date).getDate()}</strong>
                      <span>{fmtDate(item.date, { short: true, year: false }).split(" ")[1]}</span>
                    </span>
                    <span className="list-main">
                      <strong>{item.activity}</strong>
                      <span>{item.room?.name} · {timeLabel(item.start)}–{timeLabel(item.end)}</span>
                    </span>
                    <StatusPill status={item.status} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">
                <span className="empty-icon"><Icon name="calendar" /></span>
                <h3>Belum ada jadwal terdekat</h3>
                <p>Reservasi yang disetujui admin akan muncul di sini.</p>
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="panel">
            <div className="panel-head"><h3>Menu cepat</h3></div>
            <div className="quick-actions">
              <button type="button" className="quick-action" onClick={() => onNavigate("rooms")}>
                <Icon name="search" /> Cari ruangan
              </button>
              <button type="button" className="quick-action" onClick={() => onNavigate("booking")}>
                <Icon name="plus" /> Ajukan peminjaman
              </button>
              <button type="button" className="quick-action" onClick={() => onNavigate("mine")}>
                <Icon name="list" /> Peminjaman saya
              </button>
              <button type="button" className="quick-action" onClick={() => onNavigate("settings")}>
                <Icon name="database" /> Data demo
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Tips demo</h3></div>
            <div className="notice notice-info">
              <Icon name="users" />
              <div>
                <strong>Coba ganti akun</strong>
                <span>
                  Setelah mengajukan, pilih akun admin di pojok kanan atas. Pengajuan Anda akan terlihat dan bisa
                  diputuskan di sana.
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function DemoRoomsView({
  user,
  reservations,
  onBook,
  onSchedule,
}: {
  user: SessionUser;
  reservations: Reservation[];
  onBook: (roomId: string, date: string, start?: string, end?: string) => void;
  onSchedule: (roomId: string) => void;
}) {
  const canBook = user.role !== "admin";
  const firstAvailable = nextBookableDay(todayISO());
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(firstAvailable);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState("");
  const [dateNotice, setDateNotice] = useState("");

  function changeDate(value: string) {
    const next = nextBookableDay(value);
    setDate(next);
    setDateNotice(
      next !== value ? `Minggu libur. Tanggal dialihkan ke ${fmtDate(next, { weekday: true, short: true })}.` : "",
    );
  }

  function resetFilters() {
    setQuery("");
    setDate(firstAvailable);
    setStart("");
    setEnd("");
    setCapacity("");
    setDateNotice("");
  }

  const rooms = DEMO_ROOMS.filter((room) => {
    const search = query.trim().toLowerCase();
    const matchesQuery =
      !search ||
      `${room.name} ${room.code} ${room.building} ${room.facilities.join(" ")}`.toLowerCase().includes(search);
    const matchesCapacity = !capacity || room.capacity >= Number(capacity);
    return matchesQuery && matchesCapacity;
  }).filter((room) => {
    if (!start || !end) return true;
    const bookings = reservations.filter(
      (item) =>
        item.roomId === room.id &&
        item.date === date &&
        (item.status === "menunggu" || item.status === "disetujui"),
    );
    return !bookings.some((booking) => overlaps(start, end, booking));
  });

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Data contoh · {DEMO_ROOMS.length} ruangan</p>
          <h1>{canBook ? "Cari ruangan yang tersedia" : "Data ruangan kampus"}</h1>
          <p className="page-subtitle">
            {canBook
              ? "Filter berdasarkan tanggal, jam, dan kapasitas. Reservasi hanya tersedia Senin–Sabtu."
              : "Data ruangan bersifat baca-saja di mode demo. Semua perubahan reservasi tetap tersimpan di browser."}
          </p>
        </div>
        {canBook ? (
          <div className="page-actions">
            <button type="button" className="btn btn-primary" onClick={() => onBook(rooms[0]?.id ?? DEMO_ROOMS[0].id, date)}>
              <Icon name="plus" /> Ajukan peminjaman
            </button>
          </div>
        ) : null}
      </div>

      <section className="filters">
        <div className="filter-head">
          <strong>Filter ketersediaan</strong>
          <button type="button" className="btn btn-quiet btn-sm" onClick={resetFilters}>
            <Icon name="refresh" /> Reset filter
          </button>
        </div>
        <div className="form-grid cols-3">
          <div className="field">
            <label htmlFor="demo-room-search">Cari ruangan</label>
            <input
              className="input"
              id="demo-room-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nama, kode, gedung, atau fasilitas"
            />
          </div>
          <div className="field">
            <label htmlFor="demo-room-date">Tanggal</label>
            <input
              className="input"
              id="demo-room-date"
              type="date"
              min={firstAvailable}
              max={addDaysISO(todayISO(), DEMO_SETTINGS.windowDays)}
              value={date}
              onChange={(event) => changeDate(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="demo-room-capacity">Kapasitas minimal</label>
            <input
              className="input"
              id="demo-room-capacity"
              inputMode="numeric"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="Contoh: 30"
            />
          </div>
          <div className="field">
            <label htmlFor="demo-room-start">Mulai</label>
            <select className="select" id="demo-room-start" value={start} onChange={(event) => setStart(event.target.value)}>
              <option value="">Semua</option>
              <TimeOptions settings={DEMO_SETTINGS} />
            </select>
          </div>
          <div className="field">
            <label htmlFor="demo-room-end">Selesai</label>
            <select className="select" id="demo-room-end" value={end} onChange={(event) => setEnd(event.target.value)}>
              <option value="">Semua</option>
              <TimeOptions settings={DEMO_SETTINGS} />
            </select>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <div className="field-hint">
              {dateNotice || "Minggu libur. Pilih rentang waktu untuk menyaring ruangan yang bentrok."}
            </div>
          </div>
        </div>
      </section>

      <div className="filter-summary" style={{ marginTop: 18 }}>
        <span>
          Menampilkan <strong>{rooms.length}</strong> dari {DEMO_ROOMS.length} ruangan
          {start && end ? ` pada ${timeLabel(start)}–${timeLabel(end)}` : ""}.
        </span>
        <span>{fmtDate(date, { weekday: true })}</span>
      </div>

      {rooms.length ? (
        <div className="room-grid" style={{ marginTop: 0 }}>
          {rooms.map((room) => {
            const bookings = reservations
              .filter(
                (item) =>
                  item.roomId === room.id &&
                  item.date === date &&
                  (item.status === "menunggu" || item.status === "disetujui"),
              )
              .sort((a, b) => a.start.localeCompare(b.start));
            const conflict = start && end ? bookings.some((booking) => overlaps(start, end, booking)) : false;
            const afterMinutes =
              date === todayISO() ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
            const nextSlot = nextFreeSlots(bookings, DEMO_SETTINGS, 1, undefined, afterMinutes)[0];
            const useSelected = Boolean(start && end && !conflict);
            const bookStart = useSelected ? start : nextSlot?.start;
            const bookEnd = useSelected ? end : nextSlot?.end;
            const availability = start && end
              ? conflict
                ? "Jadwal bentrok"
                : "Tersedia pada jam ini"
              : bookings.length
                ? `${bookings.length} agenda`
                : "Tersedia";
            const availabilityClass = start && end
              ? conflict
                ? "is-booked"
                : "is-free"
              : bookings.length
                ? "is-busy"
                : "is-free";

            return (
              <article className="room-card" key={room.id}>
                <button
                  type="button"
                  className="room-card-media demo-room-media"
                  onClick={() => onSchedule(room.id)}
                  aria-label={`Lihat jadwal ${room.name}`}
                >
                  <Image
                    src={roomImage(room)}
                    alt={roomImageAlt(room)}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="room-code">{room.code}</span>
                  <span className={`room-availability ${availabilityClass}`}>
                    <span className="dot" /> {availability}
                  </span>
                </button>
                <div className="room-card-body">
                  <div className="room-card-head">
                    <div>
                      <h3>{room.name}</h3>
                      <p className="room-location">
                        <Icon name="pin" /> {room.building} · Lantai {room.floor}
                      </p>
                    </div>
                    <span className="capacity-badge"><Icon name="users" /> {room.capacity}</span>
                  </div>
                  <p className="room-card-note">{room.note}</p>
                  <div className="facility-list">
                    {room.facilities.slice(0, 4).map((facility) => (
                      <span className="facility-chip" key={facility}>{facility}</span>
                    ))}
                    {room.facilities.length > 4 ? (
                      <span className="facility-chip">+{room.facilities.length - 4}</span>
                    ) : null}
                  </div>
                  <div className="room-card-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSchedule(room.id)}>
                      Jadwal
                    </button>
                    {canBook ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!bookStart || !bookEnd}
                        onClick={() => onBook(room.id, date, bookStart, bookEnd)}
                      >
                        {bookStart ? "Ajukan" : "Penuh"}
                      </button>
                    ) : (
                      <span className="badge">Baca-saja</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon"><Icon name="search" /></span>
          <h3>Tidak ada ruangan yang cocok</h3>
          <p>Coba ubah kata kunci, kapasitas, atau rentang waktu.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
            Reset filter
          </button>
        </div>
      )}
    </div>
  );
}

function DemoMineView({
  user,
  reservations,
  onDetail,
  onCancel,
}: {
  user: SessionUser;
  reservations: Reservation[];
  onDetail: (reservation: Reservation) => void;
  onCancel: (reservation: Reservation) => void;
}) {
  const [status, setStatus] = useState("semua");
  const mine = reservations
    .filter((item) => item.userId === user.id)
    .filter((item) => status === "semua" || item.status === status)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">{user.fullName}</p>
          <h1>Peminjaman saya</h1>
          <p className="page-subtitle">
            Semua pengajuan Anda tersimpan di browser ini. Pengajuan yang masih menunggu dapat dibatalkan.
          </p>
        </div>
        <div className="page-actions">
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status">
            <option value="semua">Semua status</option>
            <option value="menunggu">Menunggu</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {mine.length ? (
        <div className="table-wrap">
          <table className="table table-actions-sticky">
            <thead>
              <tr>
                <th>Kegiatan</th>
                <th>Ruangan</th>
                <th>Jadwal</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mine.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cell-strong">{item.activity}</span>
                    <span className="cell-sub">{item.code} · {item.category}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{item.room?.name}</span>
                    <span className="cell-sub">{item.room?.building}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{fmtDateShort(item.date)}</span>
                    <span className="cell-sub">{timeLabel(item.start)}–{timeLabel(item.end)}</span>
                  </td>
                  <td><StatusPill status={item.status} /></td>
                  <td className="cell-actions">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDetail(item)}>
                      Detail
                    </button>
                    {item.status === "menunggu" ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancel(item)}>
                        Batalkan
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon"><Icon name="calendar" /></span>
          <h3>Belum ada pengajuan pada filter ini</h3>
          <p>Ajukan peminjaman baru atau ubah filter status.</p>
        </div>
      )}
    </div>
  );
}

function DemoScheduleView({
  reservations,
  initialRoomId,
  onDetail,
}: {
  reservations: Reservation[];
  initialRoomId?: string;
  onDetail: (reservation: Reservation) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [roomId, setRoomId] = useState(initialRoomId ?? "semua");
  const today = todayISO();
  const todayDate = parseDateISO(today);
  const mondayOffset = (todayDate.getDay() + 6) % 7;
  const thisMonday = addDaysISO(today, -mondayOffset);
  const weekStart = addDaysISO(thisMonday, weekOffset * 7);
  const days = Array.from({ length: 6 }, (_, index) => addDaysISO(weekStart, index));
  const filtered = reservations.filter(
    (item) =>
      item.status !== "dibatalkan" &&
      (roomId === "semua" || item.roomId === roomId),
  );

  const byDate = new Map<string, Reservation[]>();
  for (const item of filtered) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }
  for (const list of byDate.values()) list.sort(bySchedule);

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Senin–Sabtu</p>
          <h1>Jadwal ruangan</h1>
          <p className="page-subtitle">
            Lihat agenda yang menunggu dan sudah disetujui. Klik agenda untuk melihat detail reservasi.
          </p>
        </div>
        <div className="page-actions">
          <select className="select" value={roomId} onChange={(event) => setRoomId(event.target.value)} aria-label="Filter ruangan">
            <option value="semua">Semua ruangan</option>
            {DEMO_ROOMS.map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="calendar-panel">
        <div className="calendar-toolbar">
          <div className="calendar-title">
            <Icon name="calendar" />
            <h3>
              {fmtDate(days[0], { short: true })} – {fmtDate(days[5], { short: true })}
            </h3>
          </div>
          <div className="calendar-nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((value) => value - 1)}>
              ← Minggu lalu
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>
              Minggu ini
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((value) => value + 1)}>
              Minggu depan →
            </button>
          </div>
        </div>
        <div className="calendar-scroll">
          <div className="calendar-grid">
            {days.map((date) => {
              const items = byDate.get(date) ?? [];
              const parsed = parseDateISO(date);
              return (
                <div className={`calendar-day${date === today ? " is-today" : ""}`} key={date}>
                  <div className="calendar-day-head">
                    <strong>{fmtDate(date, { weekday: true }).split(",")[0]}</strong>
                    <span>{fmtDate(date, { short: true, year: false })}</span>
                  </div>
                  <div className="calendar-day-body">
                    {items.length ? (
                      items.map((item) => (
                        <button
                          type="button"
                          className={`calendar-entry demo-calendar-entry ${item.status === "disetujui" ? "is-approved" : "is-pending"}`}
                          key={item.id}
                          onClick={() => onDetail(item)}
                          title={`${item.activity} · ${item.room?.name} · ${item.status}`}
                        >
                          <time>{timeLabel(item.start)}–{timeLabel(item.end)}</time>
                          <strong>{item.activity}</strong>
                          <small>{item.room?.name}</small>
                        </button>
                      ))
                    ) : (
                      <div className="calendar-empty">Tidak ada agenda</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-dot" /> Disetujui</span>
          <span className="legend-item"><span className="legend-dot is-pending" /> Menunggu</span>
          <span className="tiny" style={{ marginLeft: "auto" }}>
            {parsedWeekLabel(weekStart)}
          </span>
        </div>
      </div>
    </div>
  );
}

function parsedWeekLabel(weekStart: string) {
  return `Minggu dimulai ${fmtDate(weekStart, { weekday: true })}`;
}

function DemoQueueView({
  reservations,
  onDetail,
  onDecision,
}: {
  reservations: Reservation[];
  onDetail: (reservation: Reservation) => void;
  onDecision: (reservation: Reservation, decision: "disetujui" | "ditolak") => void;
}) {
  const [status, setStatus] = useState("semua");
  const [query, setQuery] = useState("");
  const pending = reservations.filter((item) => item.status === "menunggu");
  const approved = reservations.filter((item) => item.status === "disetujui");
  const rejected = reservations.filter((item) => item.status === "ditolak");
  const search = query.trim().toLowerCase();
  const filtered = reservations
    .filter((item) => status === "semua" || item.status === status)
    .filter((item) => {
      if (!search) return true;
      return `${item.code} ${item.activity} ${item.user?.fullName} ${item.room?.name}`.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      if (a.status === "menunggu" && b.status !== "menunggu") return -1;
      if (a.status !== "menunggu" && b.status === "menunggu") return 1;
      return bySchedule(a, b);
    });

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin reservasi</p>
          <h1>Pengajuan peminjaman</h1>
          <p className="page-subtitle">
            Setujui atau tolak pengajuan. Keputusan langsung disimpan di localStorage dan terlihat oleh akun pemohon.
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <StatCard icon="clock" tone="warn" value={pending.length} label="Menunggu" detail="Perlu keputusan" />
        <StatCard icon="check" tone="ok" value={approved.length} label="Disetujui" detail="Total data demo" />
        <StatCard icon="x" tone="bad" value={rejected.length} label="Ditolak" detail="Total data demo" />
        <StatCard icon="list" value={reservations.length} label="Total pengajuan" detail="Termasuk dibatalkan" />
      </div>

      <section className="filters">
        <div className="form-grid cols-3">
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="demo-queue-search">Cari pengajuan</label>
            <input
              className="input"
              id="demo-queue-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Kode, kegiatan, pemohon, atau ruangan"
            />
          </div>
          <div className="field">
            <label htmlFor="demo-queue-status">Status</label>
            <select className="select" id="demo-queue-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="semua">Semua status</option>
              <option value="menunggu">Menunggu</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>
      </section>

      <div className="filter-summary" style={{ marginTop: 18 }}>
        <span><strong>{filtered.length}</strong> pengajuan ditampilkan</span>
        <span>Data tersimpan di browser</span>
      </div>

      {filtered.length ? (
        <div className="table-wrap">
          <table className="table table-actions-sticky">
            <thead>
              <tr>
                <th>Kegiatan</th>
                <th>Pemohon</th>
                <th>Ruangan</th>
                <th>Jadwal</th>
                <th>Status</th>
                <th className="cell-actions">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cell-strong">{item.activity}</span>
                    <span className="cell-sub">{item.code} · {item.category}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{item.user?.fullName}</span>
                    <span className="cell-sub">{roleLabel(item.user?.role ?? "")}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{item.room?.name}</span>
                    <span className="cell-sub">{item.room?.code}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{fmtDateShort(item.date)}</span>
                    <span className="cell-sub">{timeLabel(item.start)}–{timeLabel(item.end)}</span>
                  </td>
                  <td><StatusPill status={item.status} /></td>
                  <td className="cell-actions">
                    {item.status === "menunggu" ? (
                      <>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => onDecision(item, "disetujui")}>
                          Setujui
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDecision(item, "ditolak")}>
                          Tolak
                        </button>
                      </>
                    ) : null}
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDetail(item)}>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon"><Icon name="list" /></span>
          <h3>Tidak ada pengajuan yang cocok</h3>
          <p>Ubah filter status atau kata kunci pencarian.</p>
        </div>
      )}
    </div>
  );
}

function DemoUsersView({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Data contoh</p>
          <h1>Pengguna demo</h1>
          <p className="page-subtitle">
            Lima akun contoh digunakan untuk memperagakan alur mahasiswa, dosen, dan admin. Data pengguna bersifat
            baca-saja.
          </p>
        </div>
      </div>

      <div className="demo-user-grid">
        {DEMO_ACCOUNTS.map((account) => {
          const count = reservations.filter((item) => item.userId === account.id).length;
          return (
            <article className="panel demo-user-card" key={account.id}>
              <div className="demo-user-head">
                <span className="avatar avatar-lg">{account.initials}</span>
                <div>
                  <h3>{account.fullName}</h3>
                  <p>{account.email}</p>
                </div>
                <span className="badge">{roleLabel(account.role)}</span>
              </div>
              <div className="summary-rows">
                <div className="summary-row"><span>Identitas</span><strong>{account.identity ?? "—"}</strong></div>
                <div className="summary-row"><span>Program</span><strong>{account.program ?? "—"}</strong></div>
                <div className="summary-row"><span>Pengajuan</span><strong>{count} reservasi</strong></div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DemoSettingsView({
  reservations,
  onReset,
  onExport,
}: {
  reservations: Reservation[];
  onReset: () => void;
  onExport: () => void;
}) {
  const pending = reservations.filter((item) => item.status === "menunggu").length;
  const approved = reservations.filter((item) => item.status === "disetujui").length;

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Mode demo</p>
          <h1>Pengaturan data demo</h1>
          <p className="page-subtitle">
            Data reservasi disimpan di localStorage browser ini. Tidak ada data yang dikirim ke server atau database
            produksi.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head"><h3>Status penyimpanan</h3></div>
          <div className="summary-rows">
            <div className="summary-row"><span>Key localStorage</span><strong>{DEMO_RESERVATION_KEY}</strong></div>
            <div className="summary-row"><span>Total reservasi</span><strong>{reservations.length}</strong></div>
            <div className="summary-row"><span>Menunggu</span><strong>{pending}</strong></div>
            <div className="summary-row"><span>Disetujui</span><strong>{approved}</strong></div>
          </div>
          <div className="notice notice-info" style={{ marginTop: 16 }}>
            <Icon name="database" />
            <div>
              <strong>Bertahan setelah reload</strong>
              <span>
                Data digabung dengan reservasi contoh dari kode berdasarkan id. Perubahan admin menimpa data contoh
                dengan id yang sama.
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Cara kerja demo</h3></div>
          <div className="list-rows">
            <div className="list-row">
              <span className="stat-icon"><Icon name="users" /></span>
              <span className="list-main"><strong>Satu penyimpanan untuk semua akun</strong><span>Mahasiswa dan admin di browser yang sama melihat data yang sama.</span></span>
            </div>
            <div className="list-row">
              <span className="stat-icon"><Icon name="check" /></span>
              <span className="list-main"><strong>Keputusan admin tersimpan</strong><span>Setuju atau tolak akan bertahan setelah halaman dimuat ulang.</span></span>
            </div>
            <div className="list-row">
              <span className="stat-icon"><Icon name="refresh" /></span>
              <span className="list-main"><strong>Reset kapan saja</strong><span>Kembalikan semua data ke reservasi contoh dari kode.</span></span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Ekspor data</h3></div>
          <p className="page-subtitle" style={{ marginTop: 0 }}>
            Unduh salinan reservasi demo dalam format JSON untuk diperiksa atau dicadangkan.
          </p>
          <div className="btn-group" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onExport}>
              <Icon name="download" /> Unduh JSON
            </button>
          </div>
        </section>

        <section className="panel danger-zone">
          <div className="panel-head"><h3>Reset data demo</h3></div>
          <p className="page-subtitle" style={{ marginTop: 0 }}>
            Hapus semua perubahan di localStorage dan kembalikan reservasi awal dari data contoh. Akun aktif tidak
            berubah.
          </p>
          <button type="button" className="btn btn-danger" style={{ marginTop: 16 }} onClick={onReset}>
            <Icon name="trash" /> Reset data demo
          </button>
        </section>
      </div>
    </div>
  );
}

function DemoReservationDetail({ reservation }: { reservation: Reservation }) {
  return (
    <>
      <div className="detail-code">
        <strong>{reservation.code}</strong>
        <StatusPill status={reservation.status} />
      </div>
      <div className="dl">
        <div><span>Kegiatan</span><span>{reservation.activity}</span></div>
        <div><span>Jenis</span><span>{reservation.category}</span></div>
        <div><span>Ruangan</span><span>{reservation.room?.name} ({reservation.room?.code})</span></div>
        <div><span>Tanggal</span><span>{fmtDate(reservation.date, { weekday: true })}</span></div>
        <div><span>Waktu</span><span>{timeLabel(reservation.start)}–{timeLabel(reservation.end)}</span></div>
        <div><span>Peserta</span><span>{reservation.participants} orang</span></div>
        <div><span>Pemohon</span><span>{reservation.user?.fullName} · {roleLabel(reservation.user?.role ?? "")}</span></div>
        <div><span>Kontak</span><span>{reservation.contact || "—"}</span></div>
        <div><span>Tujuan</span><span>{reservation.purpose || "—"}</span></div>
        <div><span>Catatan</span><span>{reservation.note || "—"}</span></div>
        <div><span>Dibuat</span><span>{fmtDateTime(reservation.createdAt)}</span></div>
        {reservation.decidedAt ? (
          <div><span>Diputuskan</span><span>{fmtDateTime(reservation.decidedAt)}</span></div>
        ) : null}
        {reservation.decisionNote ? (
          <div><span>Keputusan</span><span>{reservation.decisionNote}</span></div>
        ) : null}
      </div>
      <div className="panel" style={{ marginTop: 16, padding: 16 }}>
        <div className="panel-head"><h3>Riwayat</h3></div>
        <div className="timeline">
          {(reservation.history ?? []).map((entry) => (
            <div className="timeline-item is-accent" key={entry.id}>
              <p className="timeline-when">{fmtDateTime(entry.createdAt)}</p>
              <p className="timeline-what">{entry.action}</p>
              {entry.note ? <p className="timeline-note">{entry.note}</p> : null}
              {entry.actorName ? <p className="timeline-note">oleh {entry.actorName}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function DemoApp() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<DemoTab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<DemoNotice | null>(null);
  const [bookingSeed, setBookingSeed] = useState<DemoBookingSeed>({ nonce: 0 });
  const [scheduleRoomId, setScheduleRoomId] = useState<string | undefined>();
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<DemoDecisionTarget | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");

  useEffect(() => {
    setUser(readDemoUser());
    setReservations(loadDemoReservations());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const admin = user?.role === "admin";
  const pendingAll = reservations.filter((item) => item.status === "menunggu").length;
  const myPending = user ? reservations.filter((item) => item.userId === user.id && item.status === "menunggu").length : 0;

  const navItems: DemoNavItem[] = admin
    ? [
        { tab: "dashboard", label: "Dashboard", icon: "home" },
        { tab: "queue", label: "Pengajuan", icon: "list", badge: pendingAll },
        { tab: "rooms", label: "Data Ruangan", icon: "building" },
        { tab: "schedule", label: "Jadwal Ruangan", icon: "calendar" },
        { tab: "users", label: "Data Pengguna", icon: "users" },
        { tab: "settings", label: "Pengaturan Demo", icon: "settings" },
      ]
    : [
        { tab: "dashboard", label: "Dashboard", icon: "home" },
        { tab: "rooms", label: "Cari Ruangan", icon: "search" },
        { tab: "booking", label: "Ajukan Peminjaman", icon: "plus", badge: myPending || undefined },
        { tab: "mine", label: "Peminjaman Saya", icon: "list" },
        { tab: "schedule", label: "Jadwal Ruangan", icon: "calendar" },
        { tab: "settings", label: "Pengaturan Demo", icon: "settings" },
      ];

  const activeLabel = navItems.find((item) => item.tab === tab)?.label ?? "Dashboard";

  function commit(next: Reservation[]) {
    setReservations(next);
    saveDemoReservations(next);
  }

  function openTab(next: DemoTab) {
    setTab(next);
    setMobileOpen(false);
  }

  function signIn(account: SessionUser) {
    setUser(account);
    rememberDemoUser(account);
    setTab("dashboard");
    setNotice({
      tone: "ok",
      title: `Masuk sebagai ${account.fullName}`,
      message: "Data reservasi tersimpan di browser ini dan tetap terlihat saat berganti akun.",
    });
  }

  function signOut() {
    setUser(null);
    rememberDemoUser(null);
    setTab("dashboard");
    setMobileOpen(false);
  }

  function openBooking(roomId?: string, date?: string, start?: string, end?: string) {
    setBookingSeed({ roomId, date, start, end, nonce: Date.now() });
    setTab("booking");
    setMobileOpen(false);
  }

  function openSchedule(roomId?: string) {
    setScheduleRoomId(roomId);
    setTab("schedule");
    setMobileOpen(false);
  }

  function handleBookingCreated(result: Extract<DemoMutationResult, { ok: true }>) {
    commit(result.reservations);
    setNotice({
      tone: "ok",
      title: "Pengajuan berhasil dikirim",
      message: "Status awal Menunggu. Masuk sebagai admin untuk menyetujui atau menolak pengajuan ini.",
    });
    setTab("mine");
  }

  function cancelReservation() {
    if (!cancelTarget || !user) return;
    const result = cancelDemoReservation(cancelTarget.id, user, reservations);
    if (!result.ok) {
      setNotice({ tone: "bad", title: "Tidak dapat membatalkan", message: result.message });
      setCancelTarget(null);
      return;
    }
    commit(result.reservations);
    setCancelTarget(null);
    setNotice({ tone: "info", title: "Pengajuan dibatalkan", message: "Status reservasi diperbarui dan tersimpan di localStorage." });
  }

  function submitDecision() {
    if (!decisionTarget || !user) return;
    if (decisionTarget.decision === "ditolak" && decisionNote.trim().length < 3) {
      setDecisionError("Alasan penolakan wajib diisi minimal 3 karakter.");
      return;
    }
    const result = decideDemoReservation(
      decisionTarget.reservation.id,
      user,
      decisionTarget.decision,
      decisionNote,
      reservations,
    );
    if (!result.ok) {
      setDecisionError(result.message);
      return;
    }
    commit(result.reservations);
    setDecisionTarget(null);
    setDecisionNote("");
    setDecisionError("");
    setNotice({
      tone: "ok",
      title: decisionTarget.decision === "disetujui" ? "Pengajuan disetujui" : "Pengajuan ditolak",
      message: "Keputusan admin tersimpan di localStorage dan langsung terlihat oleh akun pemohon.",
    });
  }

  function resetData() {
    const initial = resetDemoReservations();
    saveDemoReservations(initial);
    setReservations(initial);
    setResetOpen(false);
    setTab("dashboard");
    setNotice({
      tone: "info",
      title: "Data demo direset",
      message: "Reservasi contoh dari kode dipulihkan. Perubahan di localStorage sudah dihapus.",
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), reservations }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reservasi-demo-idb-bali.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return <DemoBoot />;
  if (!user) return <DemoLogin onSelect={signIn} />;

  const content =
    tab === "booking" && !admin ? (
      <DemoBookingForm
        key={bookingSeed.nonce}
        user={user}
        rooms={DEMO_ROOMS}
        reservations={reservations}
        seed={bookingSeed}
        onCreated={handleBookingCreated}
        onBack={() => openTab("rooms")}
      />
    ) : tab === "mine" && !admin ? (
      <DemoMineView
        user={user}
        reservations={reservations}
        onDetail={setDetail}
        onCancel={setCancelTarget}
      />
    ) : tab === "queue" && admin ? (
      <DemoQueueView
        reservations={reservations}
        onDetail={setDetail}
        onDecision={(reservation, decision) => {
          setDecisionTarget({ reservation, decision });
          setDecisionNote("");
          setDecisionError("");
        }}
      />
    ) : tab === "users" && admin ? (
      <DemoUsersView reservations={reservations} />
    ) : tab === "rooms" ? (
      <DemoRoomsView
        user={user}
        reservations={reservations}
        onBook={openBooking}
        onSchedule={openSchedule}
      />
    ) : tab === "schedule" ? (
      <DemoScheduleView
        key={scheduleRoomId ?? "all"}
        reservations={reservations}
        initialRoomId={scheduleRoomId}
        onDetail={setDetail}
      />
    ) : tab === "settings" ? (
      <DemoSettingsView
        reservations={reservations}
        onReset={() => setResetOpen(true)}
        onExport={exportData}
      />
    ) : (
      <DemoDashboard
        user={user}
        reservations={reservations}
        onNavigate={openTab}
        onDetail={setDetail}
      />
    );

  return (
    <>
      <a className="skip-link" href="#demo-main">Lewati ke konten</a>
      <div className={`app-shell${mobileOpen ? " mobile-open" : ""}`}>
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand">
              <Image className="brand-logo" src="/idb-logo-light.png" width={46} height={31} alt="IDB Bali" priority />
              <div className="brand-copy">
                <strong>Reservasi Ruang</strong>
                <small>IDB Bali · Mode demo</small>
              </div>
            </div>
            <button type="button" className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
              <Icon name="x" />
            </button>
          </div>

          <button type="button" className="sidebar-cta" onClick={() => openTab(admin ? "queue" : "booking")}>
            <Icon name={admin ? "list" : "plus"} />
            <span>{admin ? "Tinjau Pengajuan" : "Ajukan Peminjaman"}</span>
          </button>

          <nav className="sidebar-nav" aria-label="Navigasi demo">
            <p className="sidebar-label">Menu demo</p>
            {navItems.map((item) => (
              <button
                key={item.tab}
                type="button"
                className={`nav-item demo-nav-item${tab === item.tab ? " is-active" : ""}`}
                onClick={() => openTab(item.tab)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.badge ? <span className="nav-count">{item.badge}</span> : null}
              </button>
            ))}
          </nav>

          <div className="sidebar-foot">
            <div className="sidebar-help">
              <Icon name="database" />
              <div>
                <strong>Data demo</strong>
                <span>Reservasi tersimpan di localStorage browser ini.</span>
              </div>
            </div>
            <button type="button" className="sidebar-toggle" onClick={() => setResetOpen(true)}>
              <Icon name="refresh" />
              <span>Reset data demo</span>
            </button>
            <button type="button" className="sidebar-toggle" onClick={signOut}>
              <Icon name="logout" />
              <span>Keluar demo</span>
            </button>
          </div>
        </aside>

        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <button type="button" className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
                <Icon name="list" />
              </button>
              <div className="breadcrumb">
                <span>Demo</span>
                <Icon name="arrowRight" />
                <strong>{activeLabel}</strong>
              </div>
            </div>
            <div className="topbar-actions">
              <span className="demo-mode-pill"><span className="dot" /> localStorage</span>
              <select
                className="select demo-account-select"
                value={user.id}
                onChange={(event) => {
                  const account = DEMO_ACCOUNTS.find((item) => item.id === event.target.value);
                  if (account) signIn(account);
                }}
                aria-label="Ganti akun demo"
              >
                {DEMO_ACCOUNTS.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.fullName} · {roleLabel(account.role)}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-button" onClick={() => setResetOpen(true)} aria-label="Reset data demo" title="Reset data demo">
                <Icon name="refresh" />
              </button>
              <button type="button" className="icon-button" onClick={signOut} aria-label="Keluar demo" title="Keluar demo">
                <Icon name="logout" />
              </button>
            </div>
          </header>

          <main className="app-content" id="demo-main">
            {notice ? (
              <div className={`notice notice-${notice.tone} demo-notice`} role="status">
                <Icon name={notice.tone === "ok" ? "check" : notice.tone === "bad" ? "alert" : "info"} />
                <div>
                  <strong>{notice.title}</strong>
                  <span>{notice.message}</span>
                </div>
                <button type="button" className="demo-notice-close" onClick={() => setNotice(null)} aria-label="Tutup notifikasi">
                  <Icon name="x" />
                </button>
              </div>
            ) : null}
            {content}
          </main>
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detail reservasi"
        subtitle={detail?.code}
        wide
        footer={
          <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
            Tutup
          </button>
        }
      >
        {detail ? <DemoReservationDetail reservation={detail} /> : null}
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset data demo?"
        subtitle="Tindakan ini menghapus perubahan di localStorage."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>Batal</button>
            <button type="button" className="btn btn-danger" onClick={resetData}>
              <Icon name="trash" /> Ya, reset data
            </button>
          </>
        }
      >
        <div className="notice notice-warn">
          <Icon name="alert" />
          <div>
            <strong>Semua perubahan akan hilang</strong>
            <span>
              Reservasi baru, pembatalan, serta keputusan admin yang tersimpan di browser ini akan dihapus. Data
              contoh dari kode akan dipulihkan.
            </span>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Batalkan pengajuan?"
        subtitle={cancelTarget?.code}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(null)}>Kembali</button>
            <button type="button" className="btn btn-danger" onClick={cancelReservation}>Batalkan pengajuan</button>
          </>
        }
      >
        {cancelTarget ? (
          <>
            <p><strong>{cancelTarget.activity}</strong> di {cancelTarget.room?.name} pada {fmtDate(cancelTarget.date, { weekday: true })} pukul {timeLabel(cancelTarget.start)}–{timeLabel(cancelTarget.end)}.</p>
            <div className="notice notice-warn" style={{ marginTop: 14 }}>
              <Icon name="info" />
              <div>
                <strong>Status akan menjadi Dibatalkan</strong>
                <span>Pengajuan yang sudah dibatalkan tidak dapat dikembalikan ke Menunggu.</span>
              </div>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title={decisionTarget?.decision === "disetujui" ? "Setujui pengajuan" : "Tolak pengajuan"}
        subtitle={decisionTarget?.reservation.code}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDecisionTarget(null)}>Batal</button>
            <button
              type="button"
              className={`btn ${decisionTarget?.decision === "ditolak" ? "btn-danger" : "btn-primary"}`}
              onClick={submitDecision}
            >
              <Icon name={decisionTarget?.decision === "ditolak" ? "x" : "check"} />
              {decisionTarget?.decision === "ditolak" ? "Tolak pengajuan" : "Setujui pengajuan"}
            </button>
          </>
        }
      >
        {decisionTarget ? (
          <>
            <div className="dl">
              <div><span>Kegiatan</span><span>{decisionTarget.reservation.activity}</span></div>
              <div><span>Pemohon</span><span>{decisionTarget.reservation.user?.fullName}</span></div>
              <div><span>Ruangan</span><span>{decisionTarget.reservation.room?.name}</span></div>
              <div><span>Jadwal</span><span>{fmtDate(decisionTarget.reservation.date, { weekday: true })} · {timeLabel(decisionTarget.reservation.start)}–{timeLabel(decisionTarget.reservation.end)}</span></div>
              <div><span>Peserta</span><span>{decisionTarget.reservation.participants} orang</span></div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="demo-decision-note">
                Catatan admin {decisionTarget.decision === "ditolak" ? <span className="req">*</span> : null}
              </label>
              <textarea
                className="textarea"
                id="demo-decision-note"
                rows={3}
                value={decisionNote}
                onChange={(event) => {
                  setDecisionNote(event.target.value);
                  setDecisionError("");
                }}
                placeholder={decisionTarget.decision === "ditolak" ? "Tuliskan alasan penolakan…" : "Opsional, misalnya catatan persetujuan."}
              />
              <p className="field-hint">Catatan akan tersimpan bersama keputusan di localStorage.</p>
            </div>
            {decisionError ? (
              <div className="notice notice-bad" role="alert" style={{ marginTop: 12 }}>
                <Icon name="alert" />
                <div><strong>Keputusan belum disimpan</strong><span>{decisionError}</span></div>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  );
}

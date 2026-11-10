import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getRooms, getSettings, listReservations } from "@/lib/data";
import { addDaysISO, fmtDate, isoDate, parseDateISO, todayISO } from "@/lib/format";
import { Icon } from "@/components/icons";
import { ScheduleBoard } from "@/components/schedule-board";

export const metadata: Metadata = { title: "Jadwal Ruangan" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfWeek(date: string) {
  const parsed = parseDateISO(date);
  const offset = (parsed.getDay() + 6) % 7;
  parsed.setDate(parsed.getDate() - offset);
  return isoDate(parsed);
}

function buildHref(params: { tampilan: string; ruang?: string; tanggal: string }) {
  const search = new URLSearchParams();
  if (params.tampilan === "bulan") search.set("tampilan", "bulan");
  if (params.ruang) search.set("ruang", params.ruang);
  search.set("tanggal", params.tanggal);
  return `/admin/jadwal?${search.toString()}`;
}

export default async function AdminSchedulePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const settings = await getSettings();
  const rooms = await getRooms(true);
  const view = single(params.tampilan) === "bulan" ? "bulan" : "minggu";
  const roomId = single(params.ruang) || "";
  const requestedDate = single(params.tanggal) || todayISO();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayISO();
  const today = todayISO();

  let days: string[] = [];
  let from = "";
  let to = "";

  if (view === "minggu") {
    from = startOfWeek(anchor);
    to = addDaysISO(from, 6);
    days = Array.from({ length: 7 }, (_, index) => addDaysISO(from, index));
  } else {
    const monthStart = `${anchor.slice(0, 7)}-01`;
    const parsed = parseDateISO(monthStart);
    const monthEnd = isoDate(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0));
    from = startOfWeek(monthStart);
    to = addDaysISO(startOfWeek(monthEnd), 6);
    days = Array.from({ length: 42 }, (_, index) => addDaysISO(from, index));
  }

  const reservations = await listReservations({
    from,
    to,
    statuses: ["menunggu", "disetujui"],
    roomId: roomId || undefined,
    limit: 1000,
  });

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const prevDate = view === "minggu"
    ? addDaysISO(anchor, -7)
    : isoDate(new Date(parseDateISO(anchor).getFullYear(), parseDateISO(anchor).getMonth() - 1, 1));
  const nextDate = view === "minggu"
    ? addDaysISO(anchor, 7)
    : isoDate(new Date(parseDateISO(anchor).getFullYear(), parseDateISO(anchor).getMonth() + 1, 1));
  const rangeLabel = view === "minggu"
    ? `${fmtDate(from, { short: true })} – ${fmtDate(to, { short: true })}`
    : fmtDate(`${anchor.slice(0, 7)}-01`, { year: true });
  const approvedCount = reservations.filter((item) => item.status === "disetujui").length;
  const pendingCount = reservations.filter((item) => item.status === "menunggu").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Kalender operasional</p>
          <h1>Jadwal Ruangan</h1>
          <p className="page-subtitle">
            Pantau seluruh agenda ruang kampus, termasuk pengajuan yang masih menunggu. Gunakan tampilan mingguan untuk
            operasional harian atau bulanan untuk perencanaan.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/pengajuan">
            <Icon name="list" /> Antrean Pengajuan
          </Link>
          <Link className="btn btn-primary" href="/admin/ruangan">
            <Icon name="building" /> Data Ruangan
          </Link>
        </div>
      </div>

      <div className="filters-bar">
        <form action="/admin/jadwal" method="get" style={{ display: "contents" }}>
          <div className="field">
            <label htmlFor="aj-date">Tanggal acuan</label>
            <input
              className="input"
              id="aj-date"
              type="date"
              name="tanggal"
              defaultValue={anchor}
              min={addDaysISO(today, -365)}
              max={addDaysISO(today, settings.windowDays + 31)}
            />
          </div>
          <div className="field is-search">
            <label htmlFor="aj-room">Ruangan</label>
            <select className="select" id="aj-room" name="ruang" defaultValue={roomId}>
              <option value="">Semua ruangan</option>
              {rooms.map((room) => (
                <option value={room.id} key={room.id}>
                  {room.name} · {room.code}{room.status === "nonaktif" ? " (nonaktif)" : ""}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="tampilan" value={view} />
          <button className="btn btn-primary" type="submit"><Icon name="filter" /> Tampilkan</button>
        </form>
        <div className="segmented" aria-label="Tampilan kalender">
          <Link className={view === "minggu" ? "is-active" : ""} href={buildHref({ tampilan: "minggu", ruang: roomId, tanggal: anchor })}>Mingguan</Link>
          <Link className={view === "bulan" ? "is-active" : ""} href={buildHref({ tampilan: "bulan", ruang: roomId, tanggal: anchor })}>Bulanan</Link>
        </div>
      </div>

      <div className="calendar-toolbar" style={{ padding: 0, border: 0, marginBottom: 12 }}>
        <div className="calendar-title">
          <Link className="icon-button" href={buildHref({ tampilan: view, ruang: roomId, tanggal: prevDate })} aria-label="Periode sebelumnya" title="Periode sebelumnya">
            <Icon name="arrowRight" className="icon-flip" />
          </Link>
          <div>
            <h3>{rangeLabel}</h3>
            <span className="tiny muted">
              {selectedRoom ? selectedRoom.name : "Semua ruangan"} · {approvedCount} disetujui · {pendingCount} menunggu
            </span>
          </div>
          <Link className="icon-button" href={buildHref({ tampilan: view, ruang: roomId, tanggal: nextDate })} aria-label="Periode berikutnya" title="Periode berikutnya">
            <Icon name="arrowRight" />
          </Link>
          <Link className="btn btn-ghost btn-sm" href={buildHref({ tampilan: view, ruang: roomId, tanggal: today })}>Hari ini</Link>
        </div>
        <span className="badge">{selectedRoom ? selectedRoom.code : "Semua ruang"}</span>
      </div>

      {reservations.length ? (
        <ScheduleBoard days={days} reservations={reservations} view={view} today={today} />
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="calendar" /></div>
          <h3>Belum ada agenda</h3>
          <p>
            Tidak ada peminjaman pada periode ini{selectedRoom ? ` untuk ${selectedRoom.name}` : ""}. Pilih periode atau
            ruangan lain untuk melihat jadwal.
          </p>
          <Link className="btn btn-ghost" href="/admin/pengajuan">Buka Antrean Pengajuan</Link>
        </div>
      )}
    </>
  );
}

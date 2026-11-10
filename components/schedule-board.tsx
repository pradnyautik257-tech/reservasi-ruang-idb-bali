import Link from "next/link";
import type { Reservation } from "@/lib/types";
import { DAYS_ID, fmtDate, parseDateISO, timeLabel } from "@/lib/format";

function dayKey(date: string) {
  return date;
}

export function ScheduleBoard({
  days,
  reservations,
  view,
  today,
  monthMode = false,
}: {
  days: string[];
  reservations: Reservation[];
  view: "minggu" | "bulan";
  today: string;
  monthMode?: boolean;
}) {
  const byDate = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    if (!reservation.room) continue;
    const list = byDate.get(dayKey(reservation.date)) ?? [];
    list.push(reservation);
    byDate.set(reservation.date, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.start.localeCompare(b.start));
  }

  if (view === "bulan") {
    const month = parseDateISO(days[10] ?? days[0]).getMonth();
    return (
      <div className="calendar-panel">
        <div className="calendar-scroll">
          <div className="month-grid" style={{ borderBottom: "1px solid var(--line)" }}>
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
              <div className="calendar-day-head" key={day} style={{ borderBottom: 0 }}>
                <strong>{day}</strong>
              </div>
            ))}
          </div>
          <div className="month-grid">
            {days.map((date) => {
              const items = byDate.get(date) ?? [];
              const parsed = parseDateISO(date);
              const outside = parsed.getMonth() !== month;
              return (
                <div
                  className={`month-cell${outside ? " is-outside" : ""}${date === today ? " is-today" : ""}`}
                  key={date}
                >
                  <span className="month-date">{parsed.getDate()}</span>
                  <div className="month-entries">
                    {items.slice(0, 3).map((item) => (
                      <Link
                        className={`month-entry${item.status === "menunggu" ? " is-pending" : ""}`}
                        href={item.room ? `/ruang/${item.room.id}?tanggal=${date}` : "#"}
                        key={item.id}
                        title={`${timeLabel(item.start)}–${timeLabel(item.end)} · ${item.activity} · ${item.room?.name}`}
                      >
                        {timeLabel(item.start)} {item.activity}
                      </Link>
                    ))}
                    {items.length > 3 ? <span className="month-more">+{items.length - 3} agenda lain</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-dot" /> Disetujui</span>
          <span className="legend-item"><span className="legend-dot is-pending" /> Menunggu persetujuan</span>
          <span>Klik agenda untuk melihat detail ruangan.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-scroll">
        <div className="calendar-grid">
          {days.map((date) => {
            const items = byDate.get(date) ?? [];
            const parsed = parseDateISO(date);
            return (
              <div className={`calendar-day${date === today ? " is-today" : ""}`} key={date}>
                <div className="calendar-day-head">
                  <strong>{DAYS_ID[parsed.getDay()]}</strong>
                  <span>{fmtDate(date, { short: true, year: false })}</span>
                </div>
                <div className="calendar-day-body">
                  {items.slice(0, 6).map((item) => (
                    <Link
                      className={`calendar-entry ${item.status === "disetujui" ? "is-approved" : "is-pending"}`}
                      href={item.room ? `/ruang/${item.room.id}?tanggal=${date}` : "#"}
                      key={item.id}
                      title={`${item.activity} · ${item.room?.name} · ${item.status}`}
                    >
                      <time>{timeLabel(item.start)}–{timeLabel(item.end)}</time>
                      <strong>{item.activity}</strong>
                      <small>{item.room?.name} · {item.room?.code}</small>
                    </Link>
                  ))}
                  {items.length > 6 ? <span className="calendar-empty">+{items.length - 6} agenda lain</span> : null}
                  {items.length === 0 ? <span className="calendar-empty">Tidak ada agenda</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot" /> Disetujui</span>
        <span className="legend-item"><span className="legend-dot is-pending" /> Menunggu persetujuan</span>
        <span>Jadwal menunggu belum mengikat, tetapi tetap diperhitungkan saat pengajuan baru diperiksa.</span>
      </div>
    </div>
  );
}

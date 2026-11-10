import type { Settings } from "@/lib/types";
import { fmtDateShort, timeLabel, toMinutes, toTime } from "@/lib/format";

interface RibbonBooking {
  start: string;
  end: string;
  status: string;
  activity: string;
}

export function Ribbon({
  date,
  bookings,
  settings,
}: {
  date: string;
  bookings: RibbonBooking[];
  settings: Settings;
}) {
  const open = toMinutes(settings.openHour);
  const close = toMinutes(settings.closeHour);
  const span = Math.max(60, close - open);
  const active = bookings.filter((b) => b.status === "menunggu" || b.status === "disetujui");

  const label = active.length
    ? `Ketersediaan ${fmtDateShort(date)}: ${active
        .map((b) => `${timeLabel(b.start)}–${timeLabel(b.end)} ${b.status === "menunggu" ? "menunggu" : "terisi"}`)
        .join(", ")}.`
    : `Ketersediaan ${fmtDateShort(date)}: kosong sepanjang jam operasional.`;

  return (
    <div className="ribbon" role="img" aria-label={label}>
      <div className="ribbon-track">
        {active.map((booking, index) => {
          const start = Math.max(open, toMinutes(booking.start));
          const end = Math.min(close, toMinutes(booking.end));
          if (end <= start) return null;
          return (
            <span
              key={`${booking.start}-${index}`}
              className="ribbon-booked"
              style={{
                left: `${(((start - open) / span) * 100).toFixed(2)}%`,
                width: `${(((end - start) / span) * 100).toFixed(2)}%`,
              }}
              title={`${timeLabel(booking.start)}–${timeLabel(booking.end)} · ${booking.activity}`}
            />
          );
        })}
      </div>
      <div className="ribbon-scale" aria-hidden="true">
        <span>{timeLabel(settings.openHour)}</span>
        <span>{timeLabel(toTime((open + close) / 2))}</span>
        <span>{timeLabel(settings.closeHour)}</span>
      </div>
    </div>
  );
}

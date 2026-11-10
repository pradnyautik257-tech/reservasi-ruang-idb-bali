import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { roomImage, roomImageAlt } from "@/lib/room-images";
import { fmtDate, timeLabel, todayISO } from "@/lib/format";
import type { BookingSummary, Room, Settings } from "@/lib/types";
import { nextFreeSlots } from "@/lib/slots";

export function RoomCard({
  room,
  date,
  bookings,
  settings,
  free,
  timeSelected,
  canBook,
}: {
  room: Room;
  date: string;
  bookings: BookingSummary[];
  settings: Settings;
  free: boolean;
  timeSelected: boolean;
  canBook: boolean;
}) {
  const now = new Date();
  const afterMinutes = date === todayISO() ? now.getHours() * 60 + now.getMinutes() : 0;
  const slots = nextFreeSlots(bookings, settings, 1, undefined, afterMinutes);
  const nextSlot = slots[0];
  const availabilityLabel = free
    ? timeSelected
      ? "Tersedia pada jam ini"
      : "Tersedia"
    : timeSelected
      ? "Jadwal bentrok"
      : `${bookings.length} agenda`;
  const detailHref = `/ruang/${room.id}?tanggal=${encodeURIComponent(date)}`;
  const bookHref = nextSlot
    ? `/reservasi/baru?room=${room.id}&tanggal=${encodeURIComponent(date)}&mulai=${encodeURIComponent(nextSlot.start)}&selesai=${encodeURIComponent(nextSlot.end)}`
    : `/reservasi/baru?room=${room.id}&tanggal=${encodeURIComponent(date)}`;

  return (
    <article className="room-card">
      <Link className="room-card-media" href={detailHref} aria-label={`Lihat detail ${room.name}`}>
        <Image
          src={roomImage(room)}
          alt={roomImageAlt(room)}
          fill
          sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span className={`room-availability ${free ? "is-free" : timeSelected ? "is-booked" : "is-busy"}`}>
          <span className="dot" />
          {availabilityLabel}
        </span>
        <span className="room-code">{room.code}</span>
      </Link>

      <div className="room-card-body">
        <div className="room-card-head">
          <div>
            <h3>{room.name}</h3>
            <p className="room-location">
              <Icon name="pin" /> {room.building} · Lantai {room.floor}
            </p>
          </div>
          <span className="capacity-badge" title="Kapasitas maksimum">
            <Icon name="users" /> {room.capacity}
          </span>
        </div>

        <div className="facility-list" aria-label="Fasilitas">
          {room.facilities.slice(0, 4).map((facility) => (
            <span className="facility-chip" key={facility}>
              {facility}
            </span>
          ))}
          {room.facilities.length > 4 ? <span className="facility-chip">+{room.facilities.length - 4}</span> : null}
        </div>

        <div className="room-card-note">
          <Icon name={nextSlot ? "clock" : "calendar"} />
          <span>
            {nextSlot
              ? `Slot berikutnya ${timeLabel(nextSlot.start)}–${timeLabel(nextSlot.end)}`
              : `Tidak ada slot kosong pada ${fmtDate(date, { short: true })}`}
          </span>
        </div>

        <div className="room-card-actions">
          <Link className="btn btn-ghost btn-sm" href={detailHref}>
            Lihat Detail
          </Link>
          {canBook ? (
            <Link className="btn btn-primary btn-sm" href={bookHref}>
              Ajukan Peminjaman
            </Link>
          ) : (
            <span className="btn btn-disabled btn-sm">Tidak tersedia</span>
          )}
        </div>
      </div>
    </article>
  );
}

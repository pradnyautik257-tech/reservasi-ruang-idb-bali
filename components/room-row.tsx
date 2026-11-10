"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { Ribbon } from "@/components/ribbon";
import { StatusPill } from "@/components/status-pill";
import { nextFreeSlots } from "@/lib/slots";
import { fmtDateShort, timeLabel, todayISO } from "@/lib/format";
import type { BookingSummary, Room, Settings } from "@/lib/types";

interface RoomRowProps {
  room: Room;
  date: string;
  bookings: BookingSummary[];
  settings: Settings;
  free: boolean;
  stateLabel: string;
  canBook: boolean;
  bookHref: string;
}

export function RoomRow({ room, date, bookings, settings, free, stateLabel, canBook, bookHref }: RoomRowProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const afterMinutes = date === todayISO() ? now.getHours() * 60 + now.getMinutes() : 0;
  const slots = nextFreeSlots(bookings, settings, 3, undefined, afterMinutes);
  const nextSlot = slots[0];
  const targetHref = nextSlot
    ? `${bookHref}&mulai=${encodeURIComponent(nextSlot.start)}&selesai=${encodeURIComponent(nextSlot.end)}`
    : bookHref;

  return (
    <article className="room" data-room={room.id}>
      <div className={`plate${room.status === "nonaktif" ? " is-off" : ""}`} aria-hidden="true">
        {room.code}
      </div>

      <div className="room-body">
        <div className="room-title">
          <h3>{room.name}</h3>
          {room.status === "nonaktif" ? <span className="badge">Nonaktif</span> : null}
        </div>
        <div className="room-sub">
          <span>
            <Icon name="building" />
            {room.building} · Lt. {room.floor}
          </span>
          <span>
            <Icon name="users" />
            {room.capacity} orang
          </span>
          <span>
            <Icon name="calendar" />
            {fmtDateShort(date)}
          </span>
        </div>
        <div className="chips">
          {room.facilities.slice(0, 4).map((facility) => (
            <span key={facility} className="chip">
              {facility}
            </span>
          ))}
          {room.facilities.length > 4 ? <span className="chip chip-more">+{room.facilities.length - 4}</span> : null}
        </div>
      </div>

      <div className="room-avail">
        <div className={`room-state ${free ? "is-free" : "is-busy"}`}>
          <span className="dot" />
          {stateLabel}
        </div>
        <Ribbon date={date} bookings={bookings} settings={settings} />
      </div>

      <div className="room-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          Detail
        </button>
        {canBook ? (
          free ? (
            <Link className="btn btn-primary btn-sm" href={targetHref}>
              Ajukan
            </Link>
          ) : (
            <Link className="btn btn-ghost btn-sm" href={bookHref}>
              Pilih waktu lain
            </Link>
          )
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={room.name}
        subtitle={`${room.code} · ${room.building} · Kapasitas ${room.capacity} orang`}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Tutup
            </button>
            {canBook ? (
              <Link className="btn btn-primary" href={targetHref}>
                Ajukan reservasi
              </Link>
            ) : null}
          </>
        }
      >
        <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="plate" aria-hidden="true">
            {room.code}
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <div className="room-sub" style={{ marginBottom: 6 }}>
              <span>
                <Icon name="building" />
                {room.building} · Lt. {room.floor}
              </span>
              <span>
                <Icon name="users" />
                {room.capacity} orang
              </span>
            </div>
            <p className="tiny muted">{room.note}</p>
          </div>
        </div>

        <div className="chips" style={{ marginBlock: "var(--space-s)" }}>
          {room.facilities.map((facility) => (
            <span key={facility} className="chip">
              {facility}
            </span>
          ))}
        </div>

        <div className="dl" style={{ marginBottom: "var(--space-s)" }}>
          <div>
            <span>Ketersediaan {fmtDateShort(date)}</span>
            <span>
              {bookings.length ? (
                bookings.map((booking) => (
                  <span key={booking.code} style={{ display: "block", marginBottom: 6 }}>
                    {timeLabel(booking.start)}–{timeLabel(booking.end)} · {booking.activity} <StatusPill status={booking.status} />
                  </span>
                ))
              ) : (
                "Belum ada reservasi pada tanggal ini."
              )}
            </span>
          </div>
          <div>
            <span>Slot kosong berikutnya</span>
            <span>
              {slots.length
                ? slots.map((slot) => `${timeLabel(slot.start)}–${timeLabel(slot.end)}`).join(" · ")
                : "Tidak ada slot memadai pada tanggal ini."}
            </span>
          </div>
          <div>
            <span>Kode ruang</span>
            <span className="mono">{room.code}</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table" style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Kegiatan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length ? (
                bookings.map((booking) => (
                  <tr key={booking.code}>
                    <td className="mono">
                      {timeLabel(booking.start)}–{timeLabel(booking.end)}
                    </td>
                    <td>{booking.activity}</td>
                    <td>
                      <StatusPill status={booking.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="muted">
                    Kosong sepanjang hari.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </article>
  );
}

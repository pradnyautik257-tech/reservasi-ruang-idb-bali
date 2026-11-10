import { toMinutes } from "@/lib/format";
import type { Settings } from "@/lib/types";

export interface SlotBooking {
  start: string;
  end: string;
}

export interface FreeSlot {
  start: string;
  end: string;
}

export function nextFreeSlots(
  bookings: SlotBooking[],
  settings: Settings,
  count = 3,
  durationMinutes = settings.minHours * 60,
  afterMinutes = 0,
): FreeSlot[] {
  const open = toMinutes(settings.openHour);
  const close = toMinutes(settings.closeHour);
  const duration = Math.max(60, durationMinutes);
  const slots: FreeSlot[] = [];

  for (let start = open; start + duration <= close; start += duration) {
    if (start < afterMinutes) continue;
    const end = start + duration;
    const clash = bookings.some((booking) => start < toMinutes(booking.end) && end > toMinutes(booking.start));
    if (!clash) {
      slots.push({
        start: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
        end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
      });
      if (slots.length >= count) break;
    }
  }
  return slots;
}

export function overlaps(start: string, end: string, booking: SlotBooking) {
  return toMinutes(start) < toMinutes(booking.end) && toMinutes(end) > toMinutes(booking.start);
}

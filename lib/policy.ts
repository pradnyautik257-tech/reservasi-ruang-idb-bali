import type { Reservation, SessionUser, Settings } from "@/lib/types";

export function canCancelReservation(
  reservation: Pick<Reservation, "userId" | "status" | "date" | "start">,
  user: Pick<SessionUser, "id" | "role">,
  _settings: Settings,
): { allowed: boolean; reason?: string } {
  if (reservation.status !== "menunggu") {
    return {
      allowed: false,
      reason:
        reservation.status === "disetujui"
          ? "Pembatalan hanya tersedia selama pengajuan masih menunggu."
          : "Pengajuan ini sudah berstatus akhir.",
    };
  }
  if (user.role === "admin") return { allowed: true };
  if (reservation.userId !== user.id) {
    return { allowed: false, reason: "Hanya pemohon atau admin yang dapat membatalkan pengajuan ini." };
  }
  return { allowed: true };
}

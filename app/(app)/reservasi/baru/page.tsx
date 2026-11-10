import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getRooms, getSettings } from "@/lib/data";
import { BookingForm } from "@/components/booking-form";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Ajukan reservasi" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewReservationPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(["mahasiswa", "dosen"]);
  const [rooms, settings] = await Promise.all([getRooms(), getSettings()]);
  const params = await searchParams;

  if (rooms.length === 0) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: "var(--space-l)" }}>
          <div className="empty-icon">
            <Icon name="alert" />
          </div>
          <h3>Belum ada ruang aktif</h3>
          <p>Hubungi admin reservasi untuk melengkapi data ruang sebelum mengajukan pemakaian.</p>
          <Link className="btn btn-ghost" href="/">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BookingForm
      user={user}
      rooms={rooms}
      settings={settings}
      initial={{
        roomId: single(params.room) || single(params.ruang),
        date: single(params.tanggal),
        start: single(params.mulai),
        end: single(params.selesai),
        participants: single(params.peserta),
      }}
    />
  );
}

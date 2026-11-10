import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getFacilityNames, getRooms } from "@/lib/data";
import { Icon } from "@/components/icons";
import { RoomManager } from "@/components/room-manager";

export const metadata: Metadata = { title: "Data Ruangan" };

export default async function AdminRoomsPage() {
  const user = await requireRole(["admin"]);
  const [rooms, facilities] = await Promise.all([getRooms(true), getFacilityNames()]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Inventaris kampus</p>
          <h1>Data Ruangan</h1>
          <p className="page-subtitle">
            Kelola nama, lokasi, kapasitas, fasilitas, dan status ruang. Ruang nonaktif tidak muncul pada daftar
            pengajuan, tetapi riwayat peminjaman tetap tersimpan.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/ruang">
            <Icon name="eye" /> Tampilan Pengguna
          </Link>
        </div>
      </div>

      <RoomManager rooms={rooms} facilities={facilities} viewer={user} />
    </>
  );
}

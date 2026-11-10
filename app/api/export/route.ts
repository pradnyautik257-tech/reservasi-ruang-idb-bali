import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAudit, getRooms, getSettings, listReservations, listUsers } from "@/lib/data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  try {
    const [rooms, reservations, users, settings, audit] = await Promise.all([
      getRooms(true),
      listReservations({ limit: 500 }),
      listUsers(),
      getSettings(),
      getAudit(undefined, 200),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      format: "idb-reservasi/v2",
      settings,
      rooms,
      users,
      reservations,
      audit,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="idb-reservasi-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export] gagal:", error);
    return NextResponse.json({ error: "Ekspor gagal diproses." }, { status: 500 });
  }
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings, listReservations } from "@/lib/data";
import { fmtDate, fmtDateShort, relativeDay, timeLabel, todayISO } from "@/lib/format";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function StudentDashboardPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  const settings = await getSettings();
  const today = todayISO();
  const mine = await listReservations({ userId: user.id, limit: 500 });
  const pending = mine.filter((item) => item.status === "menunggu");
  const approved = mine.filter((item) => item.status === "disetujui");
  const rejected = mine.filter((item) => item.status === "ditolak");
  const latest = [...mine].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
  const upcoming = approved
    .filter((item) => item.date >= today)
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
    .slice(0, 3);

  const stats = [
    { label: "Total pengajuan", value: mine.length, icon: "list", tone: "", detail: "Seluruh riwayat peminjaman" },
    { label: "Menunggu persetujuan", value: pending.length, icon: "clock", tone: "is-warn", detail: "Sedang ditinjau admin" },
    { label: "Disetujui", value: approved.length, icon: "check", tone: "is-ok", detail: "Peminjaman aktif" },
    { label: "Ditolak", value: rejected.length, icon: "alert", tone: "is-bad", detail: "Perlu penyesuaian jadwal" },
  ];

  return (
    <>
      <section className="greeting-banner">
        <div>
          <p className="eyebrow">{fmtDate(today, { weekday: true })}</p>
          <h1>{greeting()}, {user.fullName.split(" ")[0]}.</h1>
          <p>
            Pantau status peminjaman, temukan ruang yang tersedia, dan ajukan penggunaan ruang kampus dalam satu tempat.
            {settings.announcement ? ` ${settings.announcement}` : ""}
          </p>
        </div>
        <div className="greeting-actions">
          <Link className="btn btn-primary" href="/reservasi/baru">
            <Icon name="plus" /> Ajukan Peminjaman
          </Link>
          <Link className="btn btn-ghost" href="/ruang">
            <Icon name="search" /> Cari Ruangan
          </Link>
        </div>
      </section>

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span className={`stat-icon ${stat.tone}`}>
              <Icon name={stat.icon} />
            </span>
            <div className="stat-meta">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-detail">{stat.detail}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <section className="panel" aria-labelledby="latest-title">
            <div className="panel-head">
              <div>
                <h3 id="latest-title">Peminjaman terbaru</h3>
                <p>Lima pengajuan terakhir yang Anda kirim.</p>
              </div>
              <Link className="panel-head-link" href="/reservasi">Lihat semua</Link>
            </div>

            {latest.length ? (
              <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                <table className="table" style={{ minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th>Kegiatan</th>
                      <th>Ruangan</th>
                      <th>Jadwal</th>
                      <th>Status</th>
                      <th className="cell-actions">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="cell-strong">{item.activity}</span>
                          <span className="cell-sub mono">{item.code}</span>
                        </td>
                        <td>
                          <span className="cell-strong">{item.room?.name}</span>
                          <span className="cell-sub">{item.room?.code}</span>
                        </td>
                        <td>
                          <span className="cell-strong">{fmtDateShort(item.date)}</span>
                          <span className="cell-sub">{timeLabel(item.start)}–{timeLabel(item.end)}</span>
                        </td>
                        <td><StatusPill status={item.status} /></td>
                        <td className="cell-actions">
                          <Link className="btn btn-ghost btn-sm" href={`/reservasi/${item.id}`}>Detail</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon"><Icon name="calendar" /></div>
                <h3>Belum ada peminjaman</h3>
                <p>Ajukan peminjaman pertama Anda untuk mulai menggunakan ruang kampus secara terjadwal.</p>
                <Link className="btn btn-primary" href="/reservasi/baru">Ajukan Peminjaman</Link>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="quick-title">
            <div className="panel-head">
              <div>
                <h3 id="quick-title">Akses cepat</h3>
                <p>Menu yang sering digunakan.</p>
              </div>
            </div>
            <div className="quick-actions">
              <Link className="quick-action" href="/ruang">
                <Icon name="building" /> Cari ruang kosong
              </Link>
              <Link className="quick-action" href="/jadwal">
                <Icon name="calendar" /> Buka jadwal ruangan
              </Link>
              <Link className="quick-action" href="/surat">
                <Icon name="file" /> Surat peminjaman
              </Link>
              <Link className="quick-action" href="/reservasi">
                <Icon name="list" /> Riwayat peminjaman
              </Link>
            </div>
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="panel" aria-labelledby="upcoming-title">
            <div className="panel-head">
              <div>
                <h3 id="upcoming-title">Jadwal terdekat</h3>
                <p>Peminjaman yang telah disetujui.</p>
              </div>
            </div>
            {upcoming.length ? (
              <div className="list-rows">
                {upcoming.map((item) => (
                  <Link className="list-row" href={`/reservasi/${item.id}`} key={item.id}>
                    <span className="list-date">
                      <strong>{relativeDay(item.date).startsWith("Hari") || relativeDay(item.date).startsWith("Besok") ? relativeDay(item.date).slice(0, 4) : fmtDateShort(item.date).split(" ")[0]}</strong>
                      <span>{relativeDay(item.date)}</span>
                    </span>
                    <span className="list-main">
                      <strong>{item.activity}</strong>
                      <span>{item.room?.name} · {timeLabel(item.start)}–{timeLabel(item.end)}</span>
                    </span>
                    <StatusPill status={item.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "28px 16px" }}>
                <div className="empty-icon"><Icon name="clock" /></div>
                <h3>Belum ada jadwal</h3>
                <p>Jadwal yang disetujui akan muncul di sini.</p>
              </div>
            )}
          </section>

          {pending.length ? (
            <div className="upcoming-card">
              <p className="eyebrow">Menunggu keputusan</p>
              <h4>{pending.length} pengajuan sedang ditinjau</h4>
              <p>Admin reservasi akan memeriksa ketersediaan ruang dan memberikan keputusan.</p>
              <Link className="upcoming-time" href="/reservasi?status=menunggu">
                Lihat pengajuan <Icon name="arrowRight" />
              </Link>
            </div>
          ) : (
            <div className="upcoming-card">
              <p className="eyebrow">Ruang tersedia</p>
              <h4>Mulai dari pencarian ruangan</h4>
              <p>Gunakan filter tanggal, waktu, kapasitas, dan fasilitas untuk menemukan ruang yang tepat.</p>
              <Link className="upcoming-time" href="/ruang">
                Cari ruangan <Icon name="arrowRight" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

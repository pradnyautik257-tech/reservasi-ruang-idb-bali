import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getAudit, getRooms, getSettings, getStats, listReservations, listUsers } from "@/lib/data";
import { listLetters } from "@/lib/letters";
import { fmtDate, fmtDateShort, fmtDateTime, timeLabel, todayISO } from "@/lib/format";
import { Icon } from "@/components/icons";
import { ReservationDetailButton } from "@/components/reservation-detail-button";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Dashboard Admin" };

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin"]);
  const settings = await getSettings();
  const today = todayISO();

  const [stats, all, rooms, users, audit, letters] = await Promise.all([
    getStats(),
    listReservations({ limit: 1000 }),
    getRooms(true),
    listUsers(),
    getAudit(undefined, 6),
    listLetters(300),
  ]);

  const approved = all.filter((item) => item.status === "disetujui").length;
  const rejected = all.filter((item) => item.status === "ditolak").length;
  const latest = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const todayAgenda = all
    .filter((item) => item.date === today && (item.status === "menunggu" || item.status === "disetujui"))
    .sort((a, b) => a.start.localeCompare(b.start));
  const activeRooms = rooms.filter((room) => room.status === "aktif").length;
  const nextAgenda = all
    .filter((item) => item.date > today && item.status === "disetujui")
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
    .slice(0, 3);
  const pendingItems = all.filter((item) => item.status === "menunggu").slice(0, 4);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Administrasi reservasi</p>
          <h1>Dashboard Admin</h1>
          <p className="page-subtitle">
            Ringkasan pengajuan, jadwal hari ini, dan aktivitas terbaru. Tinjau antrean secara berkala agar pemohon
            menerima keputusan tepat waktu.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/jadwal">
            <Icon name="calendar" /> Jadwal Ruangan
          </Link>
          <Link className="btn btn-primary" href="/admin/pengajuan">
            <Icon name="list" /> Tinjau Pengajuan
            {stats.pending > 0 ? <span className="badge">{stats.pending}</span> : null}
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon is-warn"><Icon name="clock" /></span>
          <div className="stat-meta">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Menunggu keputusan</span>
            <span className="stat-detail">Perlu ditinjau admin</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon is-ok"><Icon name="check" /></span>
          <div className="stat-meta">
            <span className="stat-value">{approved}</span>
            <span className="stat-label">Peminjaman disetujui</span>
            <span className="stat-detail">{rejected} pengajuan ditolak</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="calendar" /></span>
          <div className="stat-meta">
            <span className="stat-value">{stats.today}</span>
            <span className="stat-label">Agenda hari ini</span>
            <span className="stat-detail">{activeRooms} dari {rooms.length} ruang aktif</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="users" /></span>
          <div className="stat-meta">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Pengguna terdaftar</span>
            <span className="stat-detail">{letters.length} surat diterbitkan</span>
          </div>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <section className="panel" aria-labelledby="admin-latest-title">
            <div className="panel-head">
              <div>
                <h3 id="admin-latest-title">Pengajuan terbaru</h3>
                <p>Permintaan yang paling baru masuk ke sistem.</p>
              </div>
              <Link className="panel-head-link" href="/admin/pengajuan?status=semua">Lihat semua</Link>
            </div>
            {latest.length ? (
              <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                <table className="table" style={{ minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Kegiatan</th>
                      <th>Ruang &amp; jadwal</th>
                      <th>Status</th>
                      <th className="cell-actions">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((item) => (
                      <tr key={item.id}>
                        <td><span className="cell-strong mono">{item.code}</span><span className="cell-sub">{fmtDateTime(item.createdAt)}</span></td>
                        <td><span className="cell-strong">{item.activity}</span><span className="cell-sub">{item.user?.fullName} · {item.category}</span></td>
                        <td><span className="cell-strong">{item.room?.name}</span><span className="cell-sub">{fmtDateShort(item.date)} · {timeLabel(item.start)}–{timeLabel(item.end)}</span></td>
                        <td><StatusPill status={item.status} /></td>
                        <td className="cell-actions"><ReservationDetailButton id={item.id} viewer={user} settings={settings} allowCancel={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon"><Icon name="list" /></div>
                <h3>Belum ada pengajuan</h3>
                <p>Pengajuan dari mahasiswa dan dosen akan tampil di sini.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Jadwal hari ini</h3>
                <p>{fmtDate(today, { weekday: true })} · {todayAgenda.length} agenda aktif</p>
              </div>
              <Link className="panel-head-link" href="/admin/jadwal">Buka kalender</Link>
            </div>
            {todayAgenda.length ? (
              <div className="slot-list">
                {todayAgenda.map((item) => (
                  <div className={`slot-item ${item.status === "disetujui" ? "is-approved" : "is-pending"}`} key={item.id}>
                    <time>{timeLabel(item.start)}–{timeLabel(item.end)}</time>
                    <span className="grow">
                      <strong>{item.activity}</strong>
                      <small>{item.room?.name} · {item.user?.fullName}</small>
                    </span>
                    <StatusPill status={item.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "26px 16px" }}>
                <div className="empty-icon"><Icon name="calendar" /></div>
                <h3>Belum ada agenda hari ini</h3>
                <p>Jadwal yang disetujui atau masih menunggu akan muncul di sini.</p>
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Aktivitas terbaru</h3>
                <p>Jejak audit tindakan admin reservasi.</p>
              </div>
            </div>
            {audit.length ? (
              <div className="timeline">
                {audit.map((item, index) => (
                  <div className={`timeline-item${index === 0 ? " is-accent" : ""}`} key={item.id}>
                    <div className="timeline-when">{fmtDateTime(item.createdAt)} · {item.actorName ?? "Sistem"}</div>
                    <div className="timeline-what">{item.action}</div>
                    {item.entityId ? <div className="timeline-note mono">{item.entityType} · {item.entityId}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="tiny muted">Belum ada aktivitas tercatat.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Agenda berikutnya</h3>
                <p>Peminjaman disetujui setelah hari ini.</p>
              </div>
            </div>
            {nextAgenda.length ? (
              <div className="list-rows">
                {nextAgenda.map((item) => (
                  <div className="list-row" key={item.id}>
                    <span className="list-date">
                      <strong>{fmtDateShort(item.date).split(" ")[0]}</strong>
                      <span>{fmtDateShort(item.date).split(" ")[1]}</span>
                    </span>
                    <span className="list-main">
                      <strong>{item.activity}</strong>
                      <span>{item.room?.name} · {timeLabel(item.start)}–{timeLabel(item.end)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tiny muted">Belum ada agenda mendatang.</p>
            )}
            <div className="quick-actions" style={{ marginTop: 14 }}>
              <Link className="quick-action" href="/admin/ruangan"><Icon name="building" /> Kelola ruangan</Link>
              <Link className="quick-action" href="/admin/surat"><Icon name="file" /> Arsip surat</Link>
              <Link className="quick-action" href="/admin/pengguna"><Icon name="users" /> Data pengguna</Link>
              <Link className="quick-action" href="/admin/pengaturan"><Icon name="settings" /> Pengaturan</Link>
            </div>
          </section>

          {pendingItems.length ? (
            <div className="upcoming-card">
              <p className="eyebrow">Perlu tindakan</p>
              <h4>{pendingItems.length} pengajuan menunggu</h4>
              <p>{pendingItems.map((item) => item.code).join(", ")}</p>
              <Link className="upcoming-time" href="/admin/pengajuan">
                Tinjau antrean <Icon name="arrowRight" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

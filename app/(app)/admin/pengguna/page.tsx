import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { fmtDateShort, roleLabel } from "@/lib/format";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Data Pengguna" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildHref(params: { role?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.role && params.role !== "semua") search.set("role", params.role);
  if (params.q) search.set("q", params.q);
  const query = search.toString();
  return query ? `/admin/pengguna?${query}` : "/admin/pengguna";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const q = (single(params.q) || "").trim();
  const role = single(params.role) || "semua";
  const users = await listUsers();
  const counts = {
    semua: users.length,
    mahasiswa: users.filter((user) => user.role === "mahasiswa").length,
    dosen: users.filter((user) => user.role === "dosen").length,
    admin: users.filter((user) => user.role === "admin").length,
  };
  const filtered = users.filter((user) => {
    if (role !== "semua" && user.role !== role) return false;
    if (!q) return true;
    return `${user.fullName} ${user.email} ${user.identity ?? ""} ${user.program ?? ""}`.toLowerCase().includes(q.toLowerCase());
  });
  const roles = [
    { key: "semua", label: "Semua" },
    { key: "mahasiswa", label: "Mahasiswa" },
    { key: "dosen", label: "Dosen / Staf" },
    { key: "admin", label: "Admin" },
  ];
  const hasFilter = Boolean(q || role !== "semua");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Akses pengguna</p>
          <h1>Data Pengguna</h1>
          <p className="page-subtitle">
            Daftar akun yang dapat mengakses sistem peminjaman ruangan. Peran dan email dikelola melalui proses
            administrasi akun kampus.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/admin/pengaturan">
            <Icon name="settings" /> Pengaturan Sistem
          </Link>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="users" /></span>
          <div className="stat-meta">
            <span className="stat-value">{counts.semua}</span>
            <span className="stat-label">Total pengguna</span>
            <span className="stat-detail">Seluruh akun terdaftar</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="user" /></span>
          <div className="stat-meta">
            <span className="stat-value">{counts.mahasiswa}</span>
            <span className="stat-label">Mahasiswa</span>
            <span className="stat-detail">Akun pemohon mahasiswa</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Icon name="user" /></span>
          <div className="stat-meta">
            <span className="stat-value">{counts.dosen}</span>
            <span className="stat-label">Dosen / Staf</span>
            <span className="stat-detail">Akun pemohon dosen dan staf</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon is-warn"><Icon name="shield" /></span>
          <div className="stat-meta">
            <span className="stat-value">{counts.admin}</span>
            <span className="stat-label">Admin reservasi</span>
            <span className="stat-detail">Dapat menyetujui pengajuan</span>
          </div>
        </article>
      </div>

      <div className="filters-bar">
        <form action="/admin/pengguna" method="get" style={{ display: "contents" }}>
          <div className="field is-search">
            <label htmlFor="au-search">Cari pengguna</label>
            <div className="filter-search">
              <Icon name="search" />
              <input
                className="input"
                id="au-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nama, email, NIM/NIP, atau program studi"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="au-role">Peran</label>
            <select className="select" id="au-role" name="role" defaultValue={role}>
              {roles.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit"><Icon name="filter" /> Terapkan</button>
          {hasFilter ? <Link className="btn btn-ghost" href="/admin/pengguna">Atur Ulang</Link> : null}
        </form>
      </div>

      <div className="filter-summary">
        <span><strong>{filtered.length}</strong> pengguna ditemukan</span>
        <div className="quick-filters">
          {roles.map((item) => (
            <Link
              key={item.key}
              href={buildHref({ role: item.key, q })}
              className={`quick-filter${role === item.key ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 840 }}>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Peran</th>
                <th>NIM / NIP</th>
                <th>Program studi / unit</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="avatar">{initialsOf(user.fullName)}</span>
                      <span>
                        <span className="cell-strong">{user.fullName}</span>
                        <span className="cell-sub">{user.email}</span>
                      </span>
                    </div>
                  </td>
                  <td><span className="badge">{roleLabel(user.role)}</span></td>
                  <td><span className="cell-strong mono">{user.role === "admin" ? "—" : user.identity || "—"}</span></td>
                  <td>{user.program || <span className="muted">Belum diisi</span>}</td>
                  <td><span className="cell-strong">{fmtDateShort(user.createdAt)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Icon name="search" /></div>
          <h3>Tidak ada pengguna yang cocok</h3>
          <p>Ubah kata kunci atau filter peran untuk melihat pengguna lain.</p>
          <Link className="btn btn-ghost" href="/admin/pengguna">Tampilkan Semua</Link>
        </div>
      )}
    </>
  );
}

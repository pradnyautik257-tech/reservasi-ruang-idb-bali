"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { logoutAction } from "@/app/actions/auth";
import { roleLabel } from "@/lib/format";
import type { SessionUser } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

function navigationFor(role: SessionUser["role"]): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Dashboard", icon: "home", exact: true },
      { href: "/admin/ruangan", label: "Data Ruangan", icon: "building" },
      { href: "/admin/pengajuan", label: "Pengajuan Peminjaman", icon: "list" },
      { href: "/admin/jadwal", label: "Jadwal Ruangan", icon: "calendar" },
      { href: "/admin/surat", label: "Surat Peminjaman", icon: "file" },
      { href: "/admin/pengguna", label: "Data Pengguna", icon: "users" },
      { href: "/admin/pengaturan", label: "Pengaturan", icon: "settings" },
    ];
  }
  return [
    { href: "/", label: "Dashboard", icon: "home", exact: true },
    { href: "/ruang", label: "Daftar Ruangan", icon: "building" },
    { href: "/reservasi", label: "Peminjaman Saya", icon: "list" },
    { href: "/jadwal", label: "Jadwal Ruangan", icon: "calendar" },
    { href: "/surat", label: "Surat Peminjaman", icon: "file" },
    { href: "/akun", label: "Pengaturan Akun", icon: "settings" },
  ];
}

const TITLES: { match: (path: string) => boolean; eyebrow: string; title: string }[] = [
  { match: (p) => p === "/", eyebrow: "Ruang kerja mahasiswa", title: "Dashboard" },
  { match: (p) => p.startsWith("/ruang/"), eyebrow: "Daftar ruangan", title: "Detail Ruangan" },
  { match: (p) => p === "/ruang", eyebrow: "Ruang kerja mahasiswa", title: "Daftar Ruangan" },
  { match: (p) => p === "/reservasi/baru", eyebrow: "Peminjaman saya", title: "Ajukan Peminjaman" },
  { match: (p) => p.startsWith("/reservasi/sukses/"), eyebrow: "Peminjaman saya", title: "Pengajuan Terkirim" },
  { match: (p) => p.startsWith("/reservasi/"), eyebrow: "Peminjaman saya", title: "Detail Peminjaman" },
  { match: (p) => p === "/reservasi", eyebrow: "Ruang kerja mahasiswa", title: "Peminjaman Saya" },
  { match: (p) => p === "/jadwal", eyebrow: "Ruang kerja mahasiswa", title: "Jadwal Ruangan" },
  { match: (p) => p === "/surat", eyebrow: "Ruang kerja mahasiswa", title: "Surat Peminjaman" },
  { match: (p) => p.startsWith("/surat/"), eyebrow: "Surat peminjaman", title: "Pratinjau Surat" },
  { match: (p) => p === "/akun", eyebrow: "Ruang kerja mahasiswa", title: "Pengaturan Akun" },
  { match: (p) => p === "/admin", eyebrow: "Administrasi", title: "Dashboard Admin" },
  { match: (p) => p === "/admin/ruangan", eyebrow: "Administrasi", title: "Data Ruangan" },
  { match: (p) => p === "/admin/pengajuan", eyebrow: "Administrasi", title: "Pengajuan Peminjaman" },
  { match: (p) => p === "/admin/jadwal", eyebrow: "Administrasi", title: "Jadwal Ruangan" },
  { match: (p) => p === "/admin/surat", eyebrow: "Administrasi", title: "Surat Peminjaman" },
  { match: (p) => p === "/admin/pengguna", eyebrow: "Administrasi", title: "Data Pengguna" },
  { match: (p) => p === "/admin/pengaturan", eyebrow: "Administrasi", title: "Pengaturan Sistem" },
  { match: (p) => p === "/terlarang", eyebrow: "Akses", title: "Akses Dibatasi" },
];

function pageMeta(pathname: string) {
  return TITLES.find((item) => item.match(pathname)) ?? { eyebrow: "IDB Bali", title: "Sistem Peminjaman Ruangan" };
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href.split("?")[0];
  const base = item.href.split("?")[0];
  if (base === "/admin") return pathname === "/admin";
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function AppShell({
  user,
  pending,
  terms,
  children,
}: {
  user: SessionUser;
  pending: number;
  terms: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = navigationFor(user.role);
  const meta = pageMeta(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("idb-sidebar-collapsed") === "1");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(target)) setNotificationsOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("idb-sidebar-collapsed", next ? "1" : "0");
  }

  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      <a className="skip-link" href="#main">
        Lewati ke konten utama
      </a>

      <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="sidebar-brand">
          <Link href={user.role === "admin" ? "/admin" : "/"} className="brand">
            <Image className="brand-logo" src="/idb-logo-light.png" alt="" width={46} height={31} priority />
            <span className="brand-copy">
              <strong>IDB Bali</strong>
              <small>Reservasi Ruangan</small>
            </span>
          </Link>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup navigasi"
          >
            <Icon name="x" />
          </button>
        </div>

        {user.role === "mahasiswa" || user.role === "dosen" ? (
          <Link className="sidebar-cta" href="/reservasi/baru">
            <Icon name="plus" />
            <span>Ajukan Peminjaman</span>
          </Link>
        ) : null}

        <nav className="sidebar-nav">
          <p className="sidebar-label">{user.role === "admin" ? "Administrasi" : "Menu utama"}</p>
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " is-active" : ""}`}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.href === "/admin/pengajuan" && pending > 0 ? <span className="nav-count">{pending}</span> : null}
                {item.href === "/reservasi" && pending > 0 ? <span className="nav-count">{pending}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-help">
            <Icon name="info" />
            <div>
              <strong>Butuh bantuan?</strong>
              <span>Hubungi admin reservasi pada hari kerja, 08.00–16.00.</span>
            </div>
          </div>
          <button type="button" className="sidebar-toggle" onClick={toggleCollapsed} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}>
            <Icon name="arrowRight" className={collapsed ? "" : "icon-flip"} />
            <span>{collapsed ? "Perluas" : "Ciutkan sidebar"}</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka navigasi"
              aria-expanded={mobileOpen}
            >
              <Icon name="list" />
            </button>
            <div className="breadcrumb">
              <span>{meta.eyebrow}</span>
              <Icon name="arrowRight" />
              <strong>{meta.title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {user.role === "mahasiswa" || user.role === "dosen" ? (
              <Link className="btn btn-primary btn-sm topbar-cta" href="/reservasi/baru">
                <Icon name="plus" /> Ajukan
              </Link>
            ) : null}

            <div className="popover-wrap" ref={notificationRef}>
              <button
                type="button"
                className="icon-button notification-button"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setProfileOpen(false);
                }}
                aria-label="Notifikasi"
                aria-expanded={notificationsOpen}
                title="Notifikasi"
              >
                <Icon name="info" />
                {pending + terms > 0 ? <span className="notification-dot" /> : null}
              </button>
              {notificationsOpen ? (
                <div className="popover notification-popover">
                  <div className="popover-head">
                    <strong>Notifikasi</strong>
                    <span className="badge">{pending + terms}</span>
                  </div>
                  {user.role === "admin" ? (
                    <>
                      <Link href="/admin/pengajuan" className="notification-item">
                        <span className="notification-icon"><Icon name="list" /></span>
                        <span>
                          <strong>{pending} pengajuan menunggu</strong>
                          <small>Tinjau permohonan dan periksa bentrok jadwal.</small>
                        </span>
                      </Link>
                      <Link href="/admin/surat" className="notification-item">
                        <span className="notification-icon"><Icon name="file" /></span>
                        <span>
                          <strong>{terms} surat terbit</strong>
                          <small>Arsip surat peminjaman yang telah disetujui.</small>
                        </span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/reservasi?status=menunggu" className="notification-item">
                        <span className="notification-icon"><Icon name="clock" /></span>
                        <span>
                          <strong>{pending} pengajuan menunggu</strong>
                          <small>Pantau keputusan admin pada halaman peminjaman.</small>
                        </span>
                      </Link>
                      <Link href="/surat" className="notification-item">
                        <span className="notification-icon"><Icon name="file" /></span>
                        <span>
                          <strong>{terms} surat tersedia</strong>
                          <small>Buka pratinjau atau unduh surat peminjaman.</small>
                        </span>
                      </Link>
                    </>
                  )}
                  {pending + terms === 0 ? <p className="popover-empty">Belum ada notifikasi baru.</p> : null}
                </div>
              ) : null}
            </div>

            <div className="popover-wrap" ref={profileRef}>
              <button
                type="button"
                className="profile-button"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{user.initials}</span>
                <span className="profile-copy">
                  <strong>{user.fullName}</strong>
                  <small>{roleLabel(user.role)}</small>
                </span>
                <Icon name="arrowRight" className="profile-chevron" />
              </button>
              {profileOpen ? (
                <div className="popover profile-popover">
                  <div className="profile-popover-head">
                    <span className="avatar avatar-lg">{user.initials}</span>
                    <div>
                      <strong>{user.fullName}</strong>
                      <small>{user.email}</small>
                      <span className="badge">{roleLabel(user.role)}</span>
                    </div>
                  </div>
                  <Link href="/akun" className="popover-link">
                    <Icon name="user" /> Pengaturan akun
                  </Link>
                  {user.role === "admin" ? (
                    <Link href="/admin/pengaturan" className="popover-link">
                      <Icon name="settings" /> Pengaturan sistem
                    </Link>
                  ) : null}
                  <form action={logoutAction}>
                    <button type="submit" className="popover-link is-danger">
                      <Icon name="logout" /> Keluar
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

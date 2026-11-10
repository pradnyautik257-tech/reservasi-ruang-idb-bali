"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { logoutAction } from "@/app/actions/auth";
import { roleLabel } from "@/lib/format";
import type { SessionUser } from "@/lib/types";

const ROLE_HOME: Record<string, string> = { admin: "/admin" };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/reservasi") return pathname.startsWith("/reservasi");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ user, pending }: { user: SessionUser; pending: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const nav = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/ruang", label: "Ruang", icon: "grid" },
    ...(user.role === "admin"
      ? [{ href: "/admin", label: "Panel admin", icon: "shield", badge: pending }]
      : [{ href: "/reservasi", label: "Reservasi saya", icon: "calendar" }]),
  ];

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href={ROLE_HOME[user.role] ?? "/"} aria-label="IDB Bali — beranda">
          <span className="brand-mark">IDB</span>
          <span className="brand-text">
            <strong>Bali</strong>
            <small>Reservasi Ruang</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Navigasi utama">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
              {item.badge ? <span className="nav-count">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>

        <div className="user-menu" ref={menuRef}>
          <button
            className="user-btn"
            type="button"
            id="user-btn"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label={`Menu akun ${user.fullName}`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="avatar" aria-hidden="true">
              {user.initials}
            </span>
            <span className="user-meta">
              <strong>{user.fullName}</strong>
              <small>{roleLabel(user.role)}</small>
            </span>
          </button>

          <div className="user-pop" id="user-pop" hidden={!menuOpen}>
            <div className="user-pop-head">
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
            {user.role === "admin" ? (
              <Link href="/admin">
                <Icon name="shield" />
                Panel admin
              </Link>
            ) : (
              <Link href="/reservasi">
                <Icon name="calendar" />
                Reservasi saya
              </Link>
            )}
            <form action={logoutAction}>
              <button type="submit">
                <Icon name="logout" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navigasi seluler">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="mobile-link"
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button type="button" className="mobile-link" onClick={() => setAccountOpen(true)}>
          <Icon name="user" />
          <span>Akun</span>
        </button>
      </nav>

      <Modal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="Akun"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAccountOpen(false)}>
              Tutup
            </button>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-primary">
                Keluar dari akun
              </button>
            </form>
          </>
        }
      >
        <div style={{ display: "flex", gap: "var(--space-s)", alignItems: "center" }}>
          <span className="avatar" style={{ width: 48, height: 48, fontSize: 15 }}>
            {user.initials}
          </span>
          <div>
            <h3 style={{ fontSize: 17 }}>{user.fullName}</h3>
            <p className="tiny muted">{user.email}</p>
          </div>
        </div>
        <div className="dl" style={{ marginTop: "var(--space-s)" }}>
          <div>
            <span>Peran</span>
            <span>{roleLabel(user.role)}</span>
          </div>
          <div>
            <span>Identitas</span>
            <span>{user.identity ?? "—"}</span>
          </div>
          <div>
            <span>Unit</span>
            <span>{user.program ?? "—"}</span>
          </div>
        </div>
      </Modal>
    </header>
  );
}

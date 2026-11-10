export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div style={{ display: "grid", gap: "var(--space-2xs)", maxWidth: "52ch" }}>
          <div className="footer-brand">
            <span className="brand-mark" style={{ width: 30, height: 30, fontSize: 10 }}>
              IDB
            </span>
            <span className="brand-text">
              <strong style={{ fontSize: 17 }}>Bali</strong>
              <small>Reservasi Ruang</small>
            </span>
          </div>
          <p className="footer-note">
            Data reservasi disimpan pada database kampus. Setiap perubahan status tercatat untuk kebutuhan audit.
          </p>
        </div>
        <div className="footer-meta">
          <span>IDB Bali</span>
          <span>PRD 1.0</span>
          <span>Next.js · PostgreSQL</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

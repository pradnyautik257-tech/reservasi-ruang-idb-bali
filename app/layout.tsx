import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Reservasi Ruang — IDB Bali",
    template: "%s — Reservasi Ruang — IDB Bali",
  },
  description:
    "Sistem reservasi ruang kampus IDB Bali: cari ketersediaan, ajukan reservasi, dan pantau status pengajuan.",
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

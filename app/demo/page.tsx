import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Demo interaktif reservasi ruang IDB Bali. Data reservasi disimpan di localStorage browser dan tetap tersedia saat berganti akun.",
};

export default function DemoPage() {
  return <DemoApp />;
}

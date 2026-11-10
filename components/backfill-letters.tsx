"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { issueMissingLettersAction } from "@/app/actions/letters";

export function BackfillLettersButton() {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const result = await issueMissingLettersAction();
    setBusy(false);
    if (!result.ok) {
      push(result.message, "error");
      return;
    }
    push(
      result.data.count
        ? `${result.data.count} surat berhasil diterbitkan.`
        : "Semua peminjaman yang disetujui sudah memiliki surat.",
      "success",
    );
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={busy}>
      <Icon name="file" /> {busy ? "Menerbitkan…" : "Terbitkan surat tertunda"}
    </button>
  );
}

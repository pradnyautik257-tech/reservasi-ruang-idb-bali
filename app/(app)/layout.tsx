import { requireUser } from "@/lib/auth";
import { getStats, listReservations } from "@/lib/data";
import { listLetters } from "@/lib/letters";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isStaff = user.role === "admin";
  const stats = await getStats();
  const pending = isStaff
    ? stats.pending
    : (await listReservations({ userId: user.id, status: "menunggu", limit: 500 })).length;
  const terms = isStaff
    ? (await listLetters(300)).length
    : (await listLetters(300, user.id)).length;

  return (
    <ToastProvider>
      <AppShell user={user} pending={pending} terms={terms}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}

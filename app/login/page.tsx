import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const demoMode = process.env.DEMO_MODE === "true";

  return (
    <LoginForm
      demoMode={demoMode}
      demoPassword={demoMode ? process.env.SEED_PASSWORD : undefined}
      allowRegister={process.env.ALLOW_REGISTRATION !== "false"}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  if (process.env.ALLOW_REGISTRATION === "false") redirect("/login");
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return <RegisterForm />;
}

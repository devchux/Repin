import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account | Repin",
  description: "Create your Repin workspace.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : undefined;
  return <RegisterForm returnTo={safeReturnTo} />;
}

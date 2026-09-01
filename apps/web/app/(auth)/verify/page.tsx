import type { Metadata } from "next";

import { VerifyForm } from "@/components/auth/verify-form";
import type { AuthMode } from "@/hooks/useAuth";

export const metadata: Metadata = {
  title: "Verify your email | Repin",
  description: "Verify your email to continue to Repin.",
};

type VerifyPageProps = {
  searchParams: Promise<{
    mode?: string;
    returnTo?: string;
  }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { mode: requestedMode, returnTo } = await searchParams;

  const mode: AuthMode = requestedMode === "register" ? "register" : "login";

  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : undefined;
  return <VerifyForm mode={mode} returnTo={safeReturnTo} />;
}

import type { Metadata } from "next";

import { VerifyForm } from "@/components/auth/verify-form";
import type { AuthMode } from "@/lib/auth-api";

export const metadata: Metadata = {
  title: "Verify your email | Repin",
  description: "Verify your email to continue to Repin.",
};

type VerifyPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { mode: requestedMode } = await searchParams;

  const mode: AuthMode = requestedMode === "register" ? "register" : "login";

  return <VerifyForm mode={mode} />;
}

import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Repin",
  description: "Sign in to your Repin workspace.",
};

export default function LoginPage() {
  return <LoginForm />;
}

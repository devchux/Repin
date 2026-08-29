import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account | Repin",
  description: "Create your Repin workspace.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}

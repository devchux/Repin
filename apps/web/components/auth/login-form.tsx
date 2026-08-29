"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthApiError, requestLoginCode } from "@/lib/auth-api";
import { FormMessage } from "./form-message";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    try {
      const response = await requestLoginCode(email);
      sessionStorage.setItem("repin.auth.email", email);
      sessionStorage.setItem("repin.auth.mode", "login");

      if (response.data.mockCode) {
        sessionStorage.setItem("repin.auth.mockCode", response.data.mockCode);
      } else {
        sessionStorage.removeItem("repin.auth.mockCode");
      }

      router.push("/verify?mode=login");
    } catch (cause) {
      setError(
        cause instanceof AuthApiError
          ? cause.message
          : "We could not send your code. Try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter your email and we&apos;ll send you a secure sign-in code.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FormMessage message={error} />

        <div className="grid gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full active:scale-[0.98]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending code..." : "Continue with email"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Repin?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

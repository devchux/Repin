"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthApiError, requestRegistrationCode } from "@/lib/auth-api";
import { FormMessage } from "./form-message";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const input = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
    };

    try {
      const response = await requestRegistrationCode(input);
      sessionStorage.setItem("repin.auth.email", input.email);
      sessionStorage.setItem("repin.auth.mode", "register");
      sessionStorage.setItem("repin.auth.firstName", input.firstName);
      sessionStorage.setItem("repin.auth.lastName", input.lastName);

      if (response.data.mockCode) {
        sessionStorage.setItem("repin.auth.mockCode", response.data.mockCode);
      } else {
        sessionStorage.removeItem("repin.auth.mockCode");
      }

      router.push("/verify?mode=register");
    } catch (cause) {
      setError(
        cause instanceof AuthApiError
          ? cause.message
          : "We could not create your account. Try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Start a workspace that follows you across Repin&apos;s web and browser
          experiences.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FormMessage message={error} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

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
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full active:scale-[0.98]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

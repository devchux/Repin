"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import Link from "next/link";
import { type FormEvent } from "react";

import { useAuth } from "@/hooks/useAuth";

export function RegisterForm() {
  const { isRegistering, register } = useAuth();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const input = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
    };

    register(input);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              autoFocus
              disabled={isRegistering}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              disabled={isRegistering}
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
            disabled={isRegistering}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full active:scale-[0.98]"
          disabled={isRegistering}
        >
          {isRegistering ? "Creating account..." : "Create account"}
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

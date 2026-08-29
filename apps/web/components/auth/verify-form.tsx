"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import {
  AuthApiError,
  requestLoginCode,
  requestRegistrationCode,
  type AuthMode,
  verifyAuthCode,
} from "@/lib/auth-api";
import { FormMessage } from "./form-message";

type VerifyFormProps = {
  mode: AuthMode;
};

export function VerifyForm({ mode }: VerifyFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("repin.auth.email");

    if (!pendingEmail) {
      router.replace(mode === "register" ? "/register" : "/login");
      return;
    }

    setEmail(pendingEmail);
    setMockCode(sessionStorage.getItem("repin.auth.mockCode"));
  }, [mode, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || code.length !== 6) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyAuthCode(email, code);
      [
        "repin.auth.email",
        "repin.auth.mode",
        "repin.auth.mockCode",
        "repin.auth.firstName",
        "repin.auth.lastName",
      ].forEach((key) => sessionStorage.removeItem(key));
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof AuthApiError
          ? cause.message
          : "We could not verify that code. Try again.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    try {
      if (!email) {
        setError("Return to sign in to request a new code.");
        return;
      }

      let response;

      if (mode === "login") {
        response = await requestLoginCode(email);
      } else {
        const firstName = sessionStorage.getItem("repin.auth.firstName");
        const lastName = sessionStorage.getItem("repin.auth.lastName");

        if (!firstName || !lastName) {
          setError("Return to account creation to request a new code.");
          return;
        }

        response = await requestRegistrationCode({
          email,
          firstName,
          lastName,
        });
      }

      if (response.data.mockCode) {
        sessionStorage.setItem("repin.auth.mockCode", response.data.mockCode);
        setMockCode(response.data.mockCode);
      }

      setNotice("A new code has been sent to your email.");
    } catch (cause) {
      setError(
        cause instanceof AuthApiError
          ? cause.message
          : "We could not resend the code. Try again.",
      );
    } finally {
      setIsResending(false);
    }
  }

  const returnPath = mode === "register" ? "/register" : "/login";

  if (!email) {
    return (
      <div aria-label="Loading verification" className="grid gap-4">
        <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-5 h-11 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href={returnPath}
          className="mb-6 inline-flex text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We sent a six-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>. It
          expires in 10 minutes.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FormMessage message={error} />

        {notice ? (
          <p
            role="status"
            className="rounded-md border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground"
          >
            {notice}
          </p>
        ) : null}

        {mockCode ? (
          <p className="rounded-md border border-primary/20 bg-primary/8 px-3 py-2.5 text-sm text-foreground">
            Development code: <span className="font-mono">{mockCode}</span>
          </p>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="h-13 font-mono text-xl tracking-[0.45em]"
            aria-invalid={Boolean(error)}
            required
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full active:scale-[0.98]"
          disabled={isSubmitting || isResending}
        >
          {isSubmitting ? "Verifying..." : "Verify and continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t receive it?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || isSubmitting}
          className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Send a new code"}
        </button>
      </p>
    </div>
  );
}

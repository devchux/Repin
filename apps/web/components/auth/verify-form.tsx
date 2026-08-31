"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { type AuthMode, useAuth } from "@/hooks/useAuth";

type VerifyFormProps = {
  mode: AuthMode;
};

export function VerifyForm({ mode }: VerifyFormProps) {
  const router = useRouter();
  const {
    hasHydrated,
    isResending,
    isVerifying,
    pendingAuth,
    resendCode,
    verify,
  } = useAuth();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (hasHydrated && !pendingAuth) {
      router.replace(mode === "register" ? "/register" : "/login");
    }
  }, [hasHydrated, mode, pendingAuth, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify(code);
  }

  function handleResend() {
    resendCode();
  }

  const activeMode = pendingAuth?.mode ?? mode;
  const returnPath = activeMode === "register" ? "/register" : "/login";

  if (!hasHydrated || !pendingAuth) {
    return (
      <div aria-label="Loading verification" className="grid gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-5 h-11 w-full" />
        <Skeleton className="h-11 w-full" />
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
          <span className="font-medium text-foreground">
            {pendingAuth.email}
          </span>
          . It expires in 10 minutes.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        {pendingAuth.mockCode ? (
          <p className="rounded-md border border-primary/20 bg-primary/8 px-3 py-2.5 text-sm text-foreground">
            Development code:{" "}
            <span className="font-mono">{pendingAuth.mockCode}</span>
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
            required
            disabled={isVerifying}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full active:scale-[0.98]"
          disabled={isVerifying || isResending}
        >
          {isVerifying ? "Verifying..." : "Verify and continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t receive it?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || isVerifying}
          className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Send a new code"}
        </button>
      </p>
    </div>
  );
}

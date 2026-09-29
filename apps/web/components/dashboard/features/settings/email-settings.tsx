"use client";

import {
  EmailChangeChallenge,
  useConfirmEmailChange,
  useRequestEmailChange,
} from "@/hooks/useProfile";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { LoaderCircle } from "@repo/ui/icons";
import { Label } from "@repo/ui/label";
import { useState, type FormEvent } from "react";

export function EmailSettings({
  currentEmail,
}: {
  readonly currentEmail: string;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<EmailChangeChallenge>();
  const request = useRequestEmailChange(setChallenge);
  const confirm = useConfirmEmailChange(() => {
    setChallenge(undefined);
    setNewEmail("");
    setCode("");
  });

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.mutate({ email: newEmail.trim().toLowerCase() });
  }

  function confirmChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirm.mutate({ code });
  }

  return (
    <div className="mt-10 border-t pt-8">
      <h3 className="text-base font-semibold">Email address</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Change the address you use to sign in. Your current address remains
        active until the new one is verified.
      </p>

      <div className="mt-5 grid gap-2">
        <Label htmlFor="current-email">Current email</Label>
        <Input id="current-email" value={currentEmail} disabled readOnly />
      </div>

      {!challenge ? (
        <form className="mt-5 grid gap-4" onSubmit={requestCode}>
          <div className="grid gap-2">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={request.isPending}
            />
          </div>
          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={request.isPending || !newEmail.trim()}
            >
              {request.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              {request.isPending ? "Sending…" : "Send verification code"}
            </Button>
          </div>
        </form>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={confirmChange}>
          <p className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
            We sent a six-digit code to <strong>{challenge.email}</strong>.
          </p>
          {challenge.mockCode ? (
            <p className="text-sm text-muted-foreground">
              Development code:{" "}
              <span className="font-mono">{challenge.mockCode}</span>
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="email-code">Verification code</Label>
            <Input
              id="email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="max-w-xs font-mono tracking-[0.35em]"
              required
              disabled={confirm.isPending}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={confirm.isPending || code.length !== 6}
            >
              {confirm.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              {confirm.isPending ? "Confirming…" : "Confirm email change"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={confirm.isPending}
              onClick={() => {
                setChallenge(undefined);
                setCode("");
              }}
            >
              Use a different address
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

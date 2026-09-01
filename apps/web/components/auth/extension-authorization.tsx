"use client";

import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AuthorizationRequest = {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  state: string;
};

type ApiEnvelope<T> = { data: T; message: string };

const proxyUrl = (endpoint: string) =>
  `/api/proxy?${new URLSearchParams({ service: "base", endpoint })}`;

export function ExtensionAuthorization() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "checking" | "ready" | "connecting" | "error"
  >("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const request = useMemo<AuthorizationRequest | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const value = {
      clientId: params.get("client_id") ?? "",
      codeChallenge: params.get("code_challenge") ?? "",
      redirectUri: params.get("redirect_uri") ?? "",
      state: params.get("state") ?? "",
    };
    return Object.values(value).every(Boolean) ? value : null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!request) {
      setError(
        "This connection request is incomplete. Start again from the extension.",
      );
      setStatus("error");
      return () => {
        cancelled = true;
      };
    }

    const checkAccount = async () => {
      try {
        const response = await fetch(proxyUrl("/auth/me"), {
          credentials: "include",
        });
        if (cancelled) return;

        if (response.status === 401) {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        if (!response.ok) {
          setError("Repin could not verify your account. Please try again.");
          setStatus("error");
          return;
        }
        const body = (await response.json()) as ApiEnvelope<{ email: string }>;
        if (cancelled) return;
        setEmail(body.data.email);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setError("Repin could not reach the authentication service.");
        setStatus("error");
      }
    };

    void checkAccount();
    return () => {
      cancelled = true;
    };
  }, [request, router]);

  async function connect() {
    if (!request) return;
    setError(undefined);
    setStatus("connecting");
    const response = await fetch(proxyUrl("/auth/extension/authorize"), {
      body: JSON.stringify(request),
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (response.status === 401) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "The extension could not be connected.");
      setStatus("ready");
      return;
    }
    const body = (await response.json()) as ApiEnvelope<{
      redirectUrl: string;
    }>;
    window.location.assign(body.data.redirectUrl);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-xl" aria-hidden="true">
            ✓
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect the Repin extension
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Allow this browser to use your Repin workspace without asking you to
          sign in every time.
        </p>

        <div className="my-6 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              ✓
            </span>
            Save pages, notes, and highlights to your account
          </p>
          <p className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              ✓
            </span>
            Run browser actions only when Repin is active
          </p>
        </div>

        {email ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Connecting as{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          className="w-full"
          size="lg"
          disabled={status !== "ready"}
          onClick={() => void connect()}
        >
          {status === "checking" || status === "connecting" ? (
            <span
              className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden="true"
            />
          ) : null}
          {status === "connecting"
            ? "Connecting..."
            : status === "checking"
              ? "Checking account..."
              : "Connect extension"}
        </Button>
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
          You can disconnect this browser from the extension at any time.
        </p>
      </section>
    </main>
  );
}

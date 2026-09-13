"use client";

import { useStore } from "@repo/client/state";
import type { AuthUser } from "@repo/client/types/auth";
import { toast } from "@repo/ui/sonner";
import { useRouter } from "next/navigation";

import { useSend } from "./useSend";

export type { AuthMode } from "@repo/client/types/auth";

type LoginInput = {
  email: string;
};

type RegisterInput = LoginInput & {
  firstName: string;
  lastName: string;
};

type VerifyInput = LoginInput & {
  code: string;
};

type AuthCodeData = {
  expiresIn: number;
  mockCode?: string;
};

const currentReturnTo = () => {
  if (typeof window === "undefined") return undefined;
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
};

export const useAuth = () => {
  const router = useRouter();
  const hasHydrated = useStore((state) => state.hasHydrated);
  const pendingAuth = useStore((state) => state.pendingAuth);
  const reset = useStore((state) => state.reset);
  const resetPendingAuth = useStore((state) => state.resetPendingAuth);
  const setPendingAuth = useStore((state) => state.setPendingAuth);
  const setUser = useStore((state) => state.setUser);

  const loginMutation = useSend<LoginInput, AuthCodeData>("/auth/login", {
    skipAuth: true,
    onSuccess(response, { email }) {
      setPendingAuth({
        email,
        mockCode: response.data.data.mockCode,
        mode: "login",
        returnTo: currentReturnTo(),
      });
      const returnTo = currentReturnTo();
      router.push(
        `/verify?mode=login${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
      );
    },
  });

  const registerMutation = useSend<RegisterInput, AuthCodeData>(
    "/auth/register",
    {
      skipAuth: true,
      onSuccess(response, input) {
        setPendingAuth({
          ...input,
          mockCode: response.data.data.mockCode,
          mode: "register",
          returnTo: currentReturnTo(),
        });
        const returnTo = currentReturnTo();
        router.push(
          `/verify?mode=register${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
        );
      },
    },
  );

  const verifyMutation = useSend<VerifyInput, { user: AuthUser }>(
    "/auth/verify-code",
    {
      skipAuth: true,
      onSuccess(response) {
        setUser(response.data.data.user);
        const returnTo = pendingAuth?.returnTo;
        resetPendingAuth();
        // Authentication sets HTTP-only cookies through the Next.js proxy.
        // Use a document navigation so the destination starts with both the
        // new cookies and the cleared pending-auth state. A router transition
        // races VerifyForm's missing-pending-auth guard during registration.
        window.location.replace(returnTo ?? "/");
      },
    },
  );

  const resendLoginMutation = useSend<LoginInput, AuthCodeData>("/auth/login", {
    skipAuth: true,
    onSuccess(response, { email }) {
      setPendingAuth({
        email,
        mockCode: response.data.data.mockCode,
        mode: "login",
        returnTo: pendingAuth?.returnTo,
      });
    },
  });

  const resendRegistrationMutation = useSend<RegisterInput, AuthCodeData>(
    "/auth/register",
    {
      skipAuth: true,
      onSuccess(response, input) {
        setPendingAuth({
          ...input,
          mockCode: response.data.data.mockCode,
          mode: "register",
          returnTo: pendingAuth?.returnTo,
        });
      },
    },
  );

  const logoutMutation = useSend<void, null>("/auth/logout", {
    hideToast: "success",
    skipAuth: true,
    onSettled() {
      reset();
      router.replace("/login");
      router.refresh();
    },
  });

  function login(email: string) {
    loginMutation.mutate({ email });
  }

  function register(input: RegisterInput) {
    registerMutation.mutate(input);
  }

  function verify(code: string) {
    if (!pendingAuth) {
      toast.error("Start the authentication process again.");
      return;
    }

    if (code.length !== 6) {
      toast.error("Enter the six-digit code from your email.");
      return;
    }

    verifyMutation.mutate({
      code,
      email: pendingAuth.email,
    });
  }

  function resendCode() {
    if (!pendingAuth) {
      toast.error("Start the authentication process again.");
      return;
    }

    if (pendingAuth.mode === "login") {
      resendLoginMutation.mutate({ email: pendingAuth.email });
      return;
    }

    if (!pendingAuth.firstName || !pendingAuth.lastName) {
      toast.error("Return to account creation to request a new code.");
      return;
    }

    resendRegistrationMutation.mutate({
      email: pendingAuth.email,
      firstName: pendingAuth.firstName,
      lastName: pendingAuth.lastName,
    });
  }

  function logout() {
    logoutMutation.mutate(undefined);
  }

  return {
    hasHydrated,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerMutation.isPending,
    isResending:
      resendLoginMutation.isPending || resendRegistrationMutation.isPending,
    isVerifying: verifyMutation.isPending,
    login,
    logout,
    pendingAuth,
    register,
    resendCode,
    verify,
  };
};

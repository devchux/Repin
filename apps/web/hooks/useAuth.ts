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
      });
      router.push("/verify?mode=login");
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
        });
        router.push("/verify?mode=register");
      },
    },
  );

  const verifyMutation = useSend<VerifyInput, { user: AuthUser }>(
    "/auth/verify-code",
    {
      skipAuth: true,
      onSuccess(response) {
        setUser(response.data.data.user);
        resetPendingAuth();
        router.replace("/");
        router.refresh();
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

"use client";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";
import { useQueryClient } from "@repo/client/query";
import { useStore } from "@repo/client/state";

export interface UserProfile {
  readonly id: number;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface UpdateProfileRequest {
  readonly firstName: string;
  readonly lastName: string;
}

export interface EmailChangeRequest {
  readonly email: string;
}

export interface EmailChangeChallenge {
  readonly email: string;
  readonly expiresIn: number;
  readonly mockCode?: string;
}

const profileQueryKey = (id: number) => ["user", id] as const;

export function useProfile() {
  return useFetch<UserProfile>("/user/me", {
    hideToast: "all",
    queryKey: ["user", "me"],
  });
}

export function useUpdateProfile(
  userId: number,
  onUpdated?: (profile: UserProfile) => void,
) {
  const queryClient = useQueryClient();
  const currentUser = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  return useSend<UpdateProfileRequest, UserProfile>(`/user/${userId}`, {
    method: "patch",
    hideToast: "error",
    onSuccess: (response) => {
      const profile = response.data.data;
      queryClient.setQueryData(profileQueryKey(userId), response);
      queryClient.setQueryData(["user", "me"], response);
      if (currentUser) setUser({ ...currentUser, ...profile });
      onUpdated?.(profile);
    },
  });
}

export function useRequestEmailChange(
  onRequested: (challenge: EmailChangeChallenge) => void,
) {
  return useSend<EmailChangeRequest, EmailChangeChallenge>(
    "/auth/email-change/request",
    {
      successMessage: "Verification code sent",
      onSuccess: (response) => onRequested(response.data.data),
    },
  );
}

export function useConfirmEmailChange(
  onChanged: (profile: UserProfile) => void,
) {
  const queryClient = useQueryClient();
  const currentUser = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  return useSend<{ code: string }, { user: UserProfile }>(
    "/auth/email-change/confirm",
    {
      onSuccess: (response) => {
        const profile = response.data.data.user;
        queryClient.setQueryData(["user", "me"], {
          ...response,
          data: { ...response.data, data: profile },
        });
        queryClient.setQueryData(profileQueryKey(profile.id), {
          ...response,
          data: { ...response.data, data: profile },
        });
        if (currentUser) setUser({ ...currentUser, ...profile });
        onChanged(profile);
      },
    },
  );
}

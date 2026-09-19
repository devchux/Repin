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

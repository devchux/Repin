"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type QueryClientConfig,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { useStore } from "./store/state";

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
};

export function createRepinQueryClient(config?: QueryClientConfig) {
  return new QueryClient(config ?? defaultQueryClientConfig);
}

export function RepinQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createRepinQueryClient());

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
};
export type {
  QueryClientConfig,
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
};

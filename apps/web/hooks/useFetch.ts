"use client";

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@repo/client/query";
import type { AxiosError, AxiosRequestConfig } from "@repo/client/http";

import { api, type ProxyService } from "@/lib/api";
import type { ApiError, RequestParams, Response } from "@/types/api";
import { useEffect } from "react";
import { toast } from "@repo/ui/sonner";

type FetchOptions<T> = Omit<
  UseQueryOptions<Response<T>, AxiosError<ApiError>, Response<T>, QueryKey>,
  "queryFn" | "queryKey"
> & {
  config?: AxiosRequestConfig;
  params?: RequestParams;
  queryKey?: QueryKey;
  service?: ProxyService;
  skipAuth?: boolean;
  onSuccess?: (data: Response<T>) => void;
  hideToast?: "none" | "success" | "error" | "all";
  successMessage?: string;
  errorMessage?: string;
  onError?: (error: Error) => void;
  select?: (data: unknown) => Response<T>;
};

export function useFetch<T>(url: string, options: FetchOptions<T> = {}) {
  const {
    config,
    params,
    queryKey,
    service = "base",
    skipAuth,
    hideToast = "none",
    onSuccess,
    onError,
    errorMessage,
    successMessage,
    ...queryOptions
  } = options;

  const query = useQuery({
    queryKey: queryKey ?? [service, url, params],
    queryFn: () =>
      api.get<T>(service, url, params, {
        ...config,
        skipAuth,
      }),
    ...queryOptions,
  });

  useEffect(() => {
    if (query.isSuccess && !query.isLoading) {
      if (!["success", "all"].includes(hideToast))
        toast.success(successMessage || query?.data?.data?.message);
      onSuccess?.(query.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isLoading, query.isSuccess]);

  useEffect(() => {
    if (query.isError && !query.isLoading) {
      const error = query.error;
      const axiosError = error?.response?.data?.error;

      if (!["error", "all"].includes(hideToast))
        toast.error(axiosError || errorMessage);
      onError?.(query.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isLoading, query.isError]);

  return { ...query };
}

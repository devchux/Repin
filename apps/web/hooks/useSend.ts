"use client";

import { useMutation } from "@repo/client/query";
import type { AxiosError, AxiosRequestConfig } from "@repo/client/http";

import { api, type ProxyService } from "@/lib/api";
import type { ApiError, RequestParams, Response } from "@/types/api";
import { toast } from "@repo/ui/sonner";

type SendMethod = "delete" | "patch" | "post" | "put";

type HideToast = "all" | "success" | "error" | "none";

export type SendOptions<T, Variables> = {
  config?: AxiosRequestConfig;
  method?: SendMethod;
  onError?: (error: AxiosError<ApiError>, variables: Variables) => void;
  onSettled?: (
    data: Response<T> | undefined,
    error: AxiosError<ApiError> | null,
    variables: Variables,
  ) => void;
  onSuccess?: (data: Response<T>, variables: Variables) => void;
  params?: RequestParams;
  service?: ProxyService;
  skipAuth?: boolean;
  successMessage?: string;
  errorMessage?: string;
  hideToast?: HideToast;
};

export function useSend<Variables, T = unknown>(
  url: string,
  options: SendOptions<T, Variables> = {},
) {
  const {
    config,
    onError,
    onSettled,
    onSuccess,
    params,
    skipAuth,
    successMessage,
    errorMessage,
    method = "post",
    service = "base",
    hideToast = "none",
  } = options;

  return useMutation<Response<T>, AxiosError<ApiError>, Variables>({
    mutationFn: (variables) => {
      const requestConfig = { ...config, skipAuth };

      if (method === "delete") {
        return api.delete<T>(service, url, params, requestConfig);
      }

      return api[method]<T, Variables>(
        service,
        url,
        variables,
        params,
        requestConfig,
      );
    },
    onSuccess(data, variables) {
      onSuccess?.(data, variables);
      if (!["success", "all"].includes(hideToast))
        toast.success(
          successMessage ?? data.data.message ?? "Request completed",
        );
    },
    onError(err, variables) {
      onError?.(err, variables);
      const error = err;
      const axiosError = error?.response?.data?.error;
      if (!["error", "all"].includes(hideToast))
        toast.error(errorMessage || axiosError || "Something went wrong");
    },
    onSettled,
  });
}

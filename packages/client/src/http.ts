import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { useStore } from "./store/state";
import type { AuthUser } from "./types/auth";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_REFRESH_PATH = "/auth/refresh";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }

  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
  }
}

export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  error?: string;
  message?: string | string[];
  statusCode?: number;
};

export type ApiClientOptions = {
  baseURL: string;
  onUnauthorized?: () => void;
  refreshPath?: string;
  timeout?: number;
};

export function createApiClient({
  baseURL,
  onUnauthorized,
  refreshPath = DEFAULT_REFRESH_PATH,
  timeout = DEFAULT_TIMEOUT_MS,
}: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: baseURL.replace(/\/$/, ""),
    timeout,
    withCredentials: true,
  });
  let refreshRequest: Promise<void> | null = null;

  const refreshSession = () => {
    if (!refreshRequest) {
      refreshRequest = client
        .post<ApiResponse<{ user: AuthUser }>>(refreshPath, undefined, {
          skipAuth: true,
        })
        .then((response) => {
          useStore.getState().setUser(response.data.data.user);
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    return refreshRequest;
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalConfig = error.config as
        | InternalAxiosRequestConfig
        | undefined;

      if (
        error.response?.status !== 401 ||
        !originalConfig ||
        originalConfig._retry ||
        originalConfig.skipAuth
      ) {
        return Promise.reject(error);
      }

      originalConfig._retry = true;

      try {
        await refreshSession();
        return client(originalConfig);
      } catch (refreshError) {
        useStore.getState().reset();
        onUnauthorized?.();
        return Promise.reject(refreshError);
      }
    },
  );

  return client;
}

export { axios };
export type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse };

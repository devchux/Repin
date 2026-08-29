import { createApiClient, type AxiosRequestConfig } from "@repo/client/http";

import type { ApiResponse, RequestParams, Response } from "@/types/api";

export type ProxyService = "base";

function createProxyUrl(
  service: ProxyService,
  endpoint: string,
  params?: RequestParams,
  responseType?: "blob",
) {
  const searchParams = new URLSearchParams({ service, endpoint });

  if (responseType) {
    searchParams.set("responseType", responseType);
  }

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return `/api/proxy?${searchParams.toString()}`;
}

const axiosClient = createApiClient({
  baseURL: "",
  refreshPath: createProxyUrl("base", "/auth/refresh"),
  onUnauthorized: () => {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  },
});

class APIService {
  private request<T>(
    method: AxiosRequestConfig["method"],
    service: ProxyService,
    endpoint: string,
    data?: unknown,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return axiosClient.request<ApiResponse<T>>({
      ...config,
      method,
      url: createProxyUrl(service, endpoint, params),
      data,
    }) as Promise<Response<T>>;
  }

  get<T>(
    service: ProxyService,
    endpoint: string,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return this.request<T>("GET", service, endpoint, undefined, params, config);
  }

  post<T, Variables = unknown>(
    service: ProxyService,
    endpoint: string,
    data?: Variables,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return this.request<T>("POST", service, endpoint, data, params, config);
  }

  put<T, Variables = unknown>(
    service: ProxyService,
    endpoint: string,
    data?: Variables,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return this.request<T>("PUT", service, endpoint, data, params, config);
  }

  patch<T, Variables = unknown>(
    service: ProxyService,
    endpoint: string,
    data?: Variables,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return this.request<T>("PATCH", service, endpoint, data, params, config);
  }

  delete<T>(
    service: ProxyService,
    endpoint: string,
    params?: RequestParams,
    config?: AxiosRequestConfig,
  ) {
    return this.request<T>(
      "DELETE",
      service,
      endpoint,
      undefined,
      params,
      config,
    );
  }
}

export const api = new APIService();

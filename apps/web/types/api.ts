import type { AxiosResponse } from "@repo/client/http";

export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type Response<T> = AxiosResponse<ApiResponse<T>>;

export type ApiError = {
  error: string;
  originalError?: unknown;
  status: number;
  statusText: string;
  timestamp: string;
};

export type RequestParams = Record<
  string,
  boolean | number | string | null | undefined
>;

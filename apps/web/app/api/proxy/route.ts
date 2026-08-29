import { axios, type AxiosError } from "@repo/client/http";
import { NextRequest, NextResponse } from "next/server";

const SERVICE_URLS = {
  base: process.env.BACKEND_API_URL ?? "http://localhost:3001/api",
};

function extractErrorMessage(err: unknown): string {
  const error = err as AxiosError<
    | string
    | {
        errors: object;
        title: string;
        detail: string;
        error: string | { message: string };
        message: string;
        errorMessage: string;
        result: { error: string; message: string };
      }
  >;

  if (error.response?.data) {
    const { data } = error.response;

    if (typeof data === "string") return data;

    if (data.errors && typeof data.errors === "object") {
      const messages: string[] = [];

      for (const [, value] of Object.entries(data.errors)) {
        if (Array.isArray(value)) messages.push(...value);
        else if (typeof value === "string") messages.push(value);
      }

      if (messages.length) return messages.join(". ");
    }

    if (data.title && data.detail) return `${data.title}: ${data.detail}`;
    if (data.title) return data.title;

    if (data.error) {
      return typeof data.error === "string"
        ? data.error
        : (data.error.message ?? JSON.stringify(data.error));
    }

    if (data.message) return data.message;
    if (data.errorMessage) return data.errorMessage;
    if (data.result?.error) return data.result.error;
    if (data.result?.message) return data.result.message;

    try {
      const s = JSON.stringify(data);
      return s.length > 500 ? "Oops! An Error Occurred, Kindly try again." : s;
    } catch {
      return "Oops! An Error Occurred, Kindly try again.";
    }
  }

  return error.message ?? "An unknown error occurred";
}

function isFormDataRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  return (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  );
}

async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  const service = url.searchParams.get("service");
  const endpoint = url.searchParams.get("endpoint");
  const responseType = url.searchParams.get("responseType");
  const isBlobRequest = responseType === "blob";

  if (!service || !SERVICE_URLS[service as keyof typeof SERVICE_URLS]) {
    return NextResponse.json(
      {
        error: "Invalid service",
        message: `Service '${service}' not found`,
      },
      { status: 400 },
    );
  }

  if (!endpoint || !endpoint.startsWith("/") || endpoint.startsWith("//")) {
    return NextResponse.json(
      { error: "A valid relative endpoint is required" },
      { status: 400 },
    );
  }

  const baseURL = SERVICE_URLS[service as keyof typeof SERVICE_URLS];
  const targetURL = `${baseURL.replace(/\/$/, "")}${endpoint}`;

  const params = new URLSearchParams(url.searchParams);
  params.delete("service");
  params.delete("endpoint");
  params.delete("responseType");

  const query = params.toString();
  const finalURL = query ? `${targetURL}?${query}` : targetURL;

  try {
    const allowedHeaders = [
      "authorization",
      "content-type",
      "accept",
      "user-agent",
      "accept-language",
      "cookie",
    ];

    const filteredHeaders: Record<string, string> = {};

    request.headers.forEach((value, key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        filteredHeaders[key] = value;
      }
    });

    let requestData;

    if (isFormDataRequest(request)) {
      requestData = await request.formData();
    } else {
      try {
        requestData = await request.json();
      } catch {
        requestData = undefined;
      }
    }

    const response = await axios({
      method: request.method,
      url: finalURL,
      data: requestData,
      headers: filteredHeaders,
      responseType: isBlobRequest ? "arraybuffer" : "json",
    });

    if (isBlobRequest) {
      return new NextResponse(Buffer.from(response.data), {
        status: response.status,
        headers: {
          "Content-Type":
            String(response.headers["content-type"] ?? "") ||
            "application/octet-stream",
          "Content-Disposition": String(
            response.headers["content-disposition"] ?? "",
          ),
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      });
    }

    const nextResponse = NextResponse.json(response.data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
    const setCookies = response.headers["set-cookie"];

    if (Array.isArray(setCookies)) {
      setCookies.forEach((cookie) =>
        nextResponse.headers.append("set-cookie", cookie),
      );
    } else if (setCookies) {
      nextResponse.headers.append("set-cookie", setCookies);
    }

    return nextResponse;
  } catch (err) {
    const error = err as AxiosError;

    const errorMessage = extractErrorMessage(error);
    const statusCode = error.response?.status || 500;

    return NextResponse.json(
      {
        error: errorMessage,
        status: statusCode,
        statusText: error.response?.statusText || "Unknown Error",
        timestamp: new Date().toISOString(),
        ...(typeof error.response?.data === "object"
          ? { originalError: error.response?.data }
          : {}),
      },
      { status: statusCode },
    );
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}

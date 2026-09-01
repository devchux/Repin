import { NextRequest, NextResponse } from "next/server";

const backendApiUrl = (
  process.env.BACKEND_API_URL ?? "http://localhost:3001/api"
).replace(/\/$/, "");

const forwardAuthentication = (request: NextRequest) => ({
  cookie: request.headers.get("cookie") ?? "",
});

const authenticationRequest = (request: NextRequest, endpoint: string) =>
  fetch(`${backendApiUrl}${endpoint}`, {
    cache: "no-store",
    headers: forwardAuthentication(request),
    method: endpoint === "/auth/refresh" ? "POST" : "GET",
  });

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
};

export async function proxy(request: NextRequest) {
  try {
    const accountResponse = await authenticationRequest(request, "/auth/me");
    if (accountResponse.ok) return NextResponse.next();
    if (accountResponse.status !== 401) return redirectToLogin(request);

    const refreshResponse = await authenticationRequest(
      request,
      "/auth/refresh",
    );
    if (!refreshResponse.ok) return redirectToLogin(request);

    const response = NextResponse.next();
    const setCookies = refreshResponse.headers.getSetCookie();
    setCookies.forEach((cookie) => response.headers.append("set-cookie", cookie));
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    "/activity/:path*",
    "/bookmarks/:path*",
    "/conversations/:path*",
    "/highlights/:path*",
    "/notes/:path*",
    "/overview/:path*",
    "/settings/:path*",
  ],
};

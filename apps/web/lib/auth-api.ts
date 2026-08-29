export type AuthMode = "login" | "register";

type ApiResponse<T> = {
  message: string;
  data: T;
};

type AuthCodeData = {
  expiresIn: number;
  mockCode?: string;
};

type VerifyCodeData = {
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
).replace(/\/$/, "");

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function request<T>(path: string, body: Record<string, string>) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      "We could not reach Repin. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (ApiResponse<T> & { statusCode?: number })
    | null;

  if (!response.ok) {
    const message = payload?.message;
    throw new AuthApiError(
      typeof message === "string" ? message : "Something went wrong.",
    );
  }

  if (!payload) {
    throw new AuthApiError("The server returned an invalid response.");
  }

  return payload;
}

export function requestLoginCode(email: string) {
  return request<AuthCodeData>("/auth/login", { email });
}

export function requestRegistrationCode(input: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return request<AuthCodeData>("/auth/register", input);
}

export function verifyAuthCode(email: string, code: string) {
  return request<VerifyCodeData>("/auth/verify-code", { email, code });
}

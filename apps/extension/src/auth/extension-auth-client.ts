type AuthUser = {
  email: string;
  id: number;
  isSuper: boolean;
};

type ExtensionTokenData = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: AuthUser;
};

type ApiEnvelope<T> = { data: T; message: string };

const ACCESS_TOKEN_KEY = "repinExtensionAccessToken";
const ACCESS_TOKEN_EXPIRY_KEY = "repinExtensionAccessTokenExpiry";
const REFRESH_TOKEN_KEY = "repinExtensionRefreshToken";
const AUTH_USER_KEY = "repinExtensionAuthUser";
const INSTALLATION_ID_KEY = "repinExtensionInstallationId";
const SERVER_URL_KEY = "repinServerUrl";
const WEB_URL_KEY = "repinWebUrl";
const DEFAULT_SERVER_URL = "http://localhost:3001";
const DEFAULT_WEB_URL = "http://localhost:3000";

let refreshRequest: Promise<string> | undefined;

export type ExtensionAuthState = {
  authenticated: boolean;
  user?: AuthUser;
};

export async function initializeExtensionAuth(): Promise<void> {
  const storageArea = browser.storage.local as typeof browser.storage.local & {
    setAccessLevel?: (options: {
      accessLevel: "TRUSTED_CONTEXTS";
    }) => Promise<void>;
  };
  await storageArea.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" });
  await getInstallationId();
}

export async function connectExtension(): Promise<ExtensionAuthState> {
  const [{ serverUrl, webUrl }, installationId] = await Promise.all([
    getServiceUrls(),
    getInstallationId(),
  ]);
  const redirectUri = browser.identity.getRedirectURL("auth");
  const codeVerifier = randomBase64Url(64);
  const state = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const authorizationUrl = new URL("/extension/authorize", webUrl);
  authorizationUrl.search = new URLSearchParams({
    client_id: browser.runtime.id,
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    state,
  }).toString();

  const callbackUrl = await browser.identity.launchWebAuthFlow({
    interactive: true,
    url: authorizationUrl.toString(),
  });
  if (!callbackUrl) throw new Error("Sign-in was cancelled");
  const callback = new URL(callbackUrl);
  if (callback.searchParams.get("state") !== state) {
    throw new Error("The authentication response could not be verified");
  }
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("The authentication code is missing");

  const response = await fetch(`${serverUrl}/api/auth/extension/token`, {
    body: JSON.stringify({
      clientId: browser.runtime.id,
      code,
      codeVerifier,
      installationId,
      redirectUri,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const tokens = await readTokenResponse(response);
  await storeTokens(tokens);
  return { authenticated: true, user: tokens.user };
}

export async function disconnectExtension(): Promise<void> {
  const [{ serverUrl }, stored] = await Promise.all([
    getServiceUrls(),
    browser.storage.local.get(REFRESH_TOKEN_KEY),
  ]);
  const refreshToken = stored[REFRESH_TOKEN_KEY] as string | undefined;
  if (refreshToken) {
    await fetch(`${serverUrl}/api/auth/extension/logout`, {
      body: JSON.stringify({ refreshToken }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }
  await clearTokens();
}

export async function getExtensionAuthState(): Promise<ExtensionAuthState> {
  const stored = await browser.storage.local.get([
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
  ]);
  const user = stored[AUTH_USER_KEY] as AuthUser | undefined;
  return {
    authenticated: Boolean(user && stored[REFRESH_TOKEN_KEY]),
    user,
  };
}

export async function authenticatedFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  let accessToken = await getAccessToken();
  let response = await fetch(input, withBearer(init, accessToken));
  if (response.status !== 401) return response;

  accessToken = await refreshAccessToken();
  response = await fetch(input, withBearer(init, accessToken));
  return response;
}

export async function getExtensionServerUrl(): Promise<string> {
  return (await getServiceUrls()).serverUrl;
}

async function getAccessToken(): Promise<string> {
  const stored = await browser.storage.session.get([
    ACCESS_TOKEN_KEY,
    ACCESS_TOKEN_EXPIRY_KEY,
  ]);
  const token = stored[ACCESS_TOKEN_KEY] as string | undefined;
  const expiresAt = stored[ACCESS_TOKEN_EXPIRY_KEY] as number | undefined;
  if (token && expiresAt && expiresAt > Date.now() + 30_000) return token;
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  if (refreshRequest) return refreshRequest;
  refreshRequest = performRefresh().finally(() => {
    refreshRequest = undefined;
  });
  return refreshRequest;
}

async function performRefresh(): Promise<string> {
  const [{ serverUrl }, stored] = await Promise.all([
    getServiceUrls(),
    browser.storage.local.get(REFRESH_TOKEN_KEY),
  ]);
  const refreshToken = stored[REFRESH_TOKEN_KEY] as string | undefined;
  if (!refreshToken) throw new Error("Connect the Repin extension to continue");
  const response = await fetch(`${serverUrl}/api/auth/extension/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) await clearTokens();
  const tokens = await readTokenResponse(response);
  await storeTokens(tokens);
  return tokens.accessToken;
}

async function readTokenResponse(
  response: Response,
): Promise<ExtensionTokenData> {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<ExtensionTokenData>
    | { message?: string }
    | null;
  if (!response.ok || !body || !("data" in body)) {
    throw new Error(body?.message ?? "Extension authentication failed");
  }
  return body.data;
}

async function storeTokens(tokens: ExtensionTokenData): Promise<void> {
  await Promise.all([
    browser.storage.session.set({
      [ACCESS_TOKEN_EXPIRY_KEY]: Date.now() + tokens.accessTokenExpiresIn,
      [ACCESS_TOKEN_KEY]: tokens.accessToken,
    }),
    browser.storage.local.set({
      [AUTH_USER_KEY]: tokens.user,
      [REFRESH_TOKEN_KEY]: tokens.refreshToken,
    }),
  ]);
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    browser.storage.session.remove([ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXPIRY_KEY]),
    browser.storage.local.remove([REFRESH_TOKEN_KEY, AUTH_USER_KEY]),
  ]);
}

async function getInstallationId(): Promise<string> {
  const stored = await browser.storage.local.get(INSTALLATION_ID_KEY);
  const existing = stored[INSTALLATION_ID_KEY] as string | undefined;
  if (existing) return existing;
  const installationId = crypto.randomUUID();
  await browser.storage.local.set({ [INSTALLATION_ID_KEY]: installationId });
  return installationId;
}

async function getServiceUrls() {
  const stored = await browser.storage.local.get([SERVER_URL_KEY, WEB_URL_KEY]);
  return {
    serverUrl:
      (stored[SERVER_URL_KEY] as string | undefined) ?? DEFAULT_SERVER_URL,
    webUrl: (stored[WEB_URL_KEY] as string | undefined) ?? DEFAULT_WEB_URL,
  };
}

function withBearer(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return { ...init, headers };
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

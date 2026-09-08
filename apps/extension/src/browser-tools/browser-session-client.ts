import {
  BROWSER_SESSION_PROTOCOL_VERSION,
  type BrowserSessionClientMessage,
  type BrowserSessionServerMessage,
} from "@repo/contracts/browser-session";
import { executeBrowserCommand } from "./browser-command-router";
import { authenticatedFetch } from "../auth/extension-auth-client";

const SERVER_URL_KEY = "repinServerUrl";
const SESSION_ID_KEY = "repinBrowserSessionId";
const COMMAND_RESULTS_KEY = "repinBrowserCommandResults";
const MAX_CACHED_COMMAND_RESULTS = 100;
let activeSocket: WebSocket | undefined;
let browserSessionIdPromise: Promise<string> | undefined;

export const getBrowserSessionId = (): Promise<string> => {
  browserSessionIdPromise ??= (async () => {
    const stored = await browser.storage.local.get(SESSION_ID_KEY);
    const existing = stored[SESSION_ID_KEY] as string | undefined;
    if (existing) return existing;
    const created = crypto.randomUUID();
    await browser.storage.local.set({ [SESSION_ID_KEY]: created });
    return created;
  })();
  return browserSessionIdPromise;
};

export const stopBrowserSession = (): void => {
  activeSocket?.close(1000, "Extension disconnected");
  activeSocket = undefined;
};

export const startBrowserSession = async (): Promise<void> => {
  const stored = await browser.storage.local.get(SERVER_URL_KEY);
  const serverUrl =
    (stored[SERVER_URL_KEY] as string | undefined) ?? "http://localhost:3001";
  const browserSessionId = await getBrowserSessionId();

  const ticketResponse = await authenticatedFetch(
    `${serverUrl}/api/browser-sessions/ticket`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ browserSessionId }),
    },
  );
  if (!ticketResponse.ok)
    throw new Error(`Browser ticket request failed (${ticketResponse.status})`);
  const body = (await ticketResponse.json()) as { data?: { ticket?: string } };
  const ticket = body.data?.ticket;
  if (!ticket) throw new Error("Browser session ticket is missing");

  const websocketUrl = new URL(serverUrl);
  websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
  websocketUrl.pathname = "/api/browser-sessions/connect";
  websocketUrl.search = new URLSearchParams({ ticket }).toString();
  const socket = new WebSocket(websocketUrl);
  activeSocket = socket;
  const running = new Map<string, AbortController>();

  socket.addEventListener("open", () =>
    send(socket, {
      protocolVersion: BROWSER_SESSION_PROTOCOL_VERSION,
      type: "browser.session.ready",
      payload: { browserSessionId },
    }),
  );
  socket.addEventListener("message", async (event) => {
    const message = JSON.parse(
      String(event.data),
    ) as BrowserSessionServerMessage;
    if (message.protocolVersion !== BROWSER_SESSION_PROTOCOL_VERSION) return;
    if (message.type === "browser.command.cancel") {
      running.get(message.payload.commandId)?.abort();
      running.delete(message.payload.commandId);
      return;
    }
    const controller = new AbortController();
    running.set(message.payload.commandId, controller);
    try {
      const cached = message.payload.cacheResult
        ? await readCachedResult(message.payload.commandId)
        : undefined;
      if (cached !== undefined) {
        send(socket, {
          protocolVersion: 1,
          type: "browser.command.result",
          payload: { commandId: message.payload.commandId, result: cached },
        });
        return;
      }
      const result = await executeBrowserCommand(message.payload);
      if (message.payload.cacheResult)
        await cacheResult(message.payload.commandId, result);
      send(socket, {
        protocolVersion: 1,
        type: "browser.command.result",
        payload: { commandId: message.payload.commandId, result },
      });
    } catch (error) {
      send(socket, {
        protocolVersion: 1,
        type: "browser.command.error",
        payload: {
          commandId: message.payload.commandId,
          code: "BROWSER_COMMAND_FAILED",
          message:
            error instanceof Error ? error.message : "Unknown browser error",
        },
      });
    } finally {
      running.delete(message.payload.commandId);
    }
  });
  await new Promise<void>((resolve) => {
    socket.addEventListener(
      "close",
      () => {
        if (activeSocket === socket) activeSocket = undefined;
        resolve();
      },
      { once: true },
    );
  });
};

const send = (socket: WebSocket, message: BrowserSessionClientMessage) =>
  socket.send(JSON.stringify(message));

const readCachedResult = async (commandId: string): Promise<unknown> => {
  const stored = await browser.storage.local.get(COMMAND_RESULTS_KEY);
  const entries =
    (stored[COMMAND_RESULTS_KEY] as Record<string, unknown> | undefined) ?? {};
  return entries[commandId];
};

const cacheResult = async (commandId: string, result: unknown) => {
  const stored = await browser.storage.local.get(COMMAND_RESULTS_KEY);
  const entries = Object.entries(
    (stored[COMMAND_RESULTS_KEY] as Record<string, unknown> | undefined) ?? {},
  );
  entries.push([commandId, result]);
  await browser.storage.local.set({
    [COMMAND_RESULTS_KEY]: Object.fromEntries(
      entries.slice(-MAX_CACHED_COMMAND_RESULTS),
    ),
  });
};

import {
  BROWSER_SESSION_PROTOCOL_VERSION,
  type BrowserSessionClientMessage,
  type BrowserSessionServerMessage,
} from "@repo/contracts/browser-session";
import { executeBrowserCommand } from "./browser-command-router";

const SERVER_URL_KEY = "repinServerUrl";
const SESSION_ID_KEY = "repinBrowserSessionId";

export const startBrowserSession = async (): Promise<void> => {
  const stored = await browser.storage.local.get([
    SERVER_URL_KEY,
    SESSION_ID_KEY,
  ]);
  const serverUrl =
    (stored[SERVER_URL_KEY] as string | undefined) ?? "http://localhost:8080";
  const browserSessionId =
    (stored[SESSION_ID_KEY] as string | undefined) ?? crypto.randomUUID();
  await browser.storage.local.set({ [SESSION_ID_KEY]: browserSessionId });

  const ticketResponse = await fetch(
    `${serverUrl}/api/browser-sessions/ticket`,
    {
      method: "POST",
      credentials: "include",
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
      const result = await executeBrowserCommand(message.payload);
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
    socket.addEventListener("close", () => resolve(), { once: true });
  });
};

const send = (socket: WebSocket, message: BrowserSessionClientMessage) =>
  socket.send(JSON.stringify(message));

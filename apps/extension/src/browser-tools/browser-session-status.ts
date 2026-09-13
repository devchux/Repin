export const BROWSER_SESSION_STATUS_KEY = "repinBrowserSessionStatus";
export const BROWSER_SESSION_STATUS_PORT = "repin.browser-session-status";

export type BrowserSessionConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface BrowserSessionStatus {
  readonly state: BrowserSessionConnectionState;
  readonly sessionId?: string;
  readonly message?: string;
  readonly updatedAt: string;
}

export const disconnectedBrowserSessionStatus = (): BrowserSessionStatus => ({
  state: "disconnected",
  updatedAt: new Date().toISOString(),
});

const subscribers = new Set<Browser.runtime.Port>();

const deliverStatus = (
  port: Browser.runtime.Port,
  status: BrowserSessionStatus,
) => {
  try {
    port.postMessage(status);
  } catch (error) {
    subscribers.delete(port);
    console.warn("Repin could not deliver browser-session status", error);
  }
};

export const registerBrowserSessionStatusManager = () => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== BROWSER_SESSION_STATUS_PORT) return;
    subscribers.add(port);
    port.onDisconnect.addListener(() => subscribers.delete(port));
    void browser.storage.session
      .get(BROWSER_SESSION_STATUS_KEY)
      .then((stored) =>
        deliverStatus(
          port,
          (stored[BROWSER_SESSION_STATUS_KEY] as
            | BrowserSessionStatus
            | undefined) ?? disconnectedBrowserSessionStatus(),
        ),
      )
      .catch((error: unknown) => {
        subscribers.delete(port);
        console.warn(
          "Repin could not initialize browser-session status",
          error,
        );
      });
  });
};

export const publishBrowserSessionStatus = async (
  status: Omit<BrowserSessionStatus, "updatedAt">,
) => {
  const nextStatus = {
    ...status,
    updatedAt: new Date().toISOString(),
  } satisfies BrowserSessionStatus;
  try {
    await browser.storage.session.set({
      [BROWSER_SESSION_STATUS_KEY]: nextStatus,
    });
    subscribers.forEach((port) => deliverStatus(port, nextStatus));
  } catch (error) {
    console.warn("Repin could not publish browser-session status", error);
  }
};

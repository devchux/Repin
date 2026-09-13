import { useEffect, useState } from "react";

import {
  BROWSER_SESSION_STATUS_PORT,
  disconnectedBrowserSessionStatus,
  type BrowserSessionStatus,
} from "../browser-tools/browser-session-status";
import { runPortOperation } from "../lib/runtime-errors";

export const useBrowserSessionStatus = () => {
  const [status, setStatus] = useState<BrowserSessionStatus>(
    disconnectedBrowserSessionStatus,
  );

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let port: Browser.runtime.Port | undefined;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      setStatus({
        state: "reconnecting",
        message: "Restoring browser-session status.",
        updatedAt: new Date().toISOString(),
      });
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, 1_000);
    };

    const connect = () => {
      if (disposed) return;
      try {
        const nextPort = browser.runtime.connect({
          name: BROWSER_SESSION_STATUS_PORT,
        });
        if (!nextPort) {
          scheduleReconnect();
          return;
        }
        port = nextPort;
        nextPort.onMessage.addListener((next: BrowserSessionStatus) => {
          if (!disposed) setStatus(next);
        });
        nextPort.onDisconnect.addListener(scheduleReconnect);
      } catch (error) {
        console.warn("Repin could not open its session-status channel", error);
        scheduleReconnect();
      }
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (port) {
        runPortOperation("close its session-status channel", () =>
          port?.disconnect(),
        );
      }
    };
  }, []);

  return status;
};

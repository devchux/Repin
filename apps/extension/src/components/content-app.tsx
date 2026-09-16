import { useEffect, useMemo, useRef, useState } from "react";

import { useReducerState } from "@repo/ui/hooks/use-reducer-state";
import { RepinSidebar } from "./repin-sidebar";
import { RepinToolbar } from "./repin-toolbar";
import { useRepinTheme } from "@/hooks/use-theme";
import {
  getCurrentSelectionRange,
  getDockedSidebarWidth,
  getSelectionToolbarPosition,
  isSameSelectionRange,
} from "@/lib/utils";
import type { RepinSidebarMode, ToolbarPosition } from "@/types";
import {
  REPIN_PROTOCOL_VERSION,
  type OpenExtensionSidebarMessage,
} from "@repo/contracts/messages";
import type { SidebarSessionState } from "@/lib/sidebar-session";
import type { HighlightColor } from "@repo/contracts/highlight";
import { createHighlight } from "@/lib/highlight-client";
import { indexPageText, selectionQuote } from "@/lib/page-highlight-ranges";

interface ContentAppState {
  selectedText: string;
  sidebarMode: RepinSidebarMode;
  sidebarOpen: boolean;
  sidebarPinned: boolean;
  sidebarRequestId: string;
  toolbarPosition: ToolbarPosition | null;
}

export const ContentApp = () => {
  const [state, setState] = useReducerState<ContentAppState>({
    selectedText: "",
    sidebarMode: "summarize",
    sidebarOpen: false,
    sidebarPinned: false,
    sidebarRequestId: "",
    toolbarPosition: null,
  });
  const dismissedSelectionRangeRef = useRef<Range | null>(null);
  const pendingHighlightRequestRef = useRef<{
    range: Range;
    id: string;
  } | null>(null);
  const interactionBeforeHydrationRef = useRef(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [highlightSaving, setHighlightSaving] = useState(false);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const previousPageStylesRef = useRef<{
    bodyMarginRight: string;
    bodyTransition: string;
    rootSidebarOffset: string;
  } | null>(null);
  const theme = useRepinTheme();
  const page = useMemo(
    () => ({
      title: document.title,
      url: window.location.href,
    }),
    [],
  );

  const openSidebar = (mode: RepinSidebarMode) => {
    interactionBeforeHydrationRef.current = true;
    setState({
      selectedText: window.getSelection()?.toString().trim() ?? "",
      sidebarMode: mode,
      sidebarOpen: true,
      sidebarRequestId: crypto.randomUUID(),
    });
  };

  const saveSelectionHighlight = async (color: HighlightColor) => {
    const range = getCurrentSelectionRange();
    if (!range || !document.body) return;
    const url = window.location.href;
    if (!/^https?:\/\//i.test(url) || url.length > 4096) {
      setHighlightError("This page cannot be highlighted");
      return;
    }
    const captured = selectionQuote(indexPageText(document.body), range);
    if (!captured.quote.trim() || captured.quote.length > 50_000) {
      setHighlightError("Select a shorter passage to highlight");
      return;
    }
    setHighlightSaving(true);
    setHighlightError(null);
    const pending = pendingHighlightRequestRef.current;
    const clientId =
      pending && isSameSelectionRange(range, pending.range)
        ? pending.id
        : crypto.randomUUID();
    pendingHighlightRequestRef.current = {
      range: range.cloneRange(),
      id: clientId,
    };
    try {
      await createHighlight({
        clientId,
        url,
        pageTitle: (document.title.trim() || window.location.hostname).slice(0, 500),
        quote: captured.quote,
        prefix: captured.prefix,
        suffix: captured.suffix,
        color,
      });
      dismissedSelectionRangeRef.current = range.cloneRange();
      pendingHighlightRequestRef.current = null;
      setState({ toolbarPosition: null });
    } catch (error) {
      setHighlightError(
        error instanceof Error ? error.message : "Highlight could not be saved",
      );
    } finally {
      setHighlightSaving(false);
    }
  };

  useEffect(() => {
    let disposed = false;
    void browser.runtime
      .sendMessage({ type: "repin.sidebar.session.get" })
      .then((saved: SidebarSessionState | null) => {
        if (disposed || interactionBeforeHydrationRef.current || !saved) return;
        setState({
          selectedText: saved.selectedText,
          sidebarMode: saved.mode,
          sidebarOpen: saved.open,
          sidebarPinned: saved.pinned,
          sidebarRequestId: saved.requestId,
        });
      })
      .catch((error: unknown) =>
        console.warn("Repin could not restore this tab's sidebar state", error),
      )
      .finally(() => {
        if (!disposed) setSessionHydrated(true);
      });
    return () => {
      disposed = true;
    };
  }, [setState]);

  useEffect(() => {
    if (!sessionHydrated) return;
    const saved: SidebarSessionState = {
      mode: state.sidebarMode,
      open: state.sidebarOpen,
      pinned: state.sidebarPinned,
      requestId: state.sidebarRequestId,
      selectedText: state.selectedText,
    };
    void browser.runtime
      .sendMessage({ type: "repin.sidebar.session.set", state: saved })
      .catch((error: unknown) =>
        console.warn("Repin could not persist this tab's sidebar state", error),
      );
  }, [
    sessionHydrated,
    state.selectedText,
    state.sidebarMode,
    state.sidebarOpen,
    state.sidebarPinned,
    state.sidebarRequestId,
  ]);

  useEffect(() => {
    const handleSidebarMessage = (message: unknown) => {
      if (
        !message ||
        typeof message !== "object" ||
        !("protocolVersion" in message) ||
        message.protocolVersion !== REPIN_PROTOCOL_VERSION ||
        !("type" in message) ||
        message.type !== "repin.sidebar.open" ||
        !("payload" in message)
      ) {
        return undefined;
      }
      const request = message as OpenExtensionSidebarMessage;
      interactionBeforeHydrationRef.current = true;
      setState({
        selectedText: "",
        sidebarMode: request.payload.mode,
        sidebarOpen: true,
        sidebarRequestId: request.payload.requestId,
      });
      return { opened: true };
    };

    browser.runtime.onMessage.addListener(handleSidebarMessage);
    return () => browser.runtime.onMessage.removeListener(handleSidebarMessage);
  }, [setState]);

  useEffect(() => {
    let frame = 0;

    const updateToolbarPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const range = getCurrentSelectionRange();

        if (!range) {
          dismissedSelectionRangeRef.current = null;
          setState({
            toolbarPosition: null,
          });
          return;
        }

        if (
          dismissedSelectionRangeRef.current &&
          isSameSelectionRange(range, dismissedSelectionRangeRef.current)
        ) {
          setState({
            toolbarPosition: null,
          });
          return;
        }

        dismissedSelectionRangeRef.current = null;
        setState({
          toolbarPosition: getSelectionToolbarPosition(range),
        });
      });
    };

    document.addEventListener("selectionchange", updateToolbarPosition);
    window.addEventListener("mouseup", updateToolbarPosition);
    window.addEventListener("keyup", updateToolbarPosition);
    window.addEventListener("resize", updateToolbarPosition);
    window.addEventListener("scroll", updateToolbarPosition, true);

    updateToolbarPosition();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", updateToolbarPosition);
      window.removeEventListener("mouseup", updateToolbarPosition);
      window.removeEventListener("keyup", updateToolbarPosition);
      window.removeEventListener("resize", updateToolbarPosition);
      window.removeEventListener("scroll", updateToolbarPosition, true);
    };
  }, [setState]);

  useEffect(() => {
    const restorePageOffset = () => {
      const previousStyles = previousPageStylesRef.current;

      if (!previousStyles) {
        return;
      }

      document.documentElement.style.setProperty(
        "--repin-sidebar-offset",
        previousStyles.rootSidebarOffset,
      );
      document.body.style.marginRight = previousStyles.bodyMarginRight;
      document.body.style.transition = previousStyles.bodyTransition;
      previousPageStylesRef.current = null;
    };

    if (!state.sidebarOpen || !state.sidebarPinned) {
      restorePageOffset();
      return;
    }

    previousPageStylesRef.current ??= {
      bodyMarginRight: document.body.style.marginRight,
      bodyTransition: document.body.style.transition,
      rootSidebarOffset: document.documentElement.style.getPropertyValue(
        "--repin-sidebar-offset",
      ),
    };

    const updatePageOffset = () => {
      const sidebarWidth = getDockedSidebarWidth();

      document.documentElement.style.setProperty(
        "--repin-sidebar-offset",
        `${sidebarWidth}px`,
      );
      document.body.style.marginRight = "var(--repin-sidebar-offset)";
      document.body.style.transition = "margin-right 200ms ease-out";
    };

    updatePageOffset();
    window.addEventListener("resize", updatePageOffset);

    return () => {
      window.removeEventListener("resize", updatePageOffset);
      restorePageOffset();
    };
  }, [state.sidebarOpen, state.sidebarPinned]);

  return (
    <div className="repin-extension antialiased">
      {state.toolbarPosition && (
        <RepinToolbar
          onClose={() => {
            dismissedSelectionRangeRef.current =
              getCurrentSelectionRange()?.cloneRange() ?? null;
            setState({
              toolbarPosition: null,
            });
          }}
          onModeSelect={openSidebar}
          onHighlightSelect={(color) => void saveSelectionHighlight(color)}
          highlightSaving={highlightSaving}
          highlightError={highlightError}
          position={state.toolbarPosition}
          theme={theme}
        />
      )}
      <RepinSidebar
        mode={state.sidebarMode}
        page={page}
        pinned={state.sidebarPinned}
        open={state.sidebarOpen}
        selectedText={state.selectedText}
        requestId={state.sidebarRequestId}
        theme={theme}
        onClose={() => setState({ sidebarOpen: false })}
        onPinnedChange={(sidebarPinned) => setState({ sidebarPinned })}
      />
    </div>
  );
};

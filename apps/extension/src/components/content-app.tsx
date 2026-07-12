import { useEffect, useMemo, useRef } from "react";

import { useReducerState } from "@repo/ui/hooks/use-reducer-state";
import { getRepinThemeClass } from "@/lib/theme";
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

interface ContentAppState {
  selectedText: string;
  sidebarMode: RepinSidebarMode;
  sidebarOpen: boolean;
  sidebarPinned: boolean;
  toolbarPosition: ToolbarPosition | null;
}

export const ContentApp = () => {
  const [state, setState] = useReducerState<ContentAppState>({
    selectedText: "",
    sidebarMode: "summarize",
    sidebarOpen: false,
    sidebarPinned: false,
    toolbarPosition: null,
  });
  const dismissedSelectionRangeRef = useRef<Range | null>(null);
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
    setState({
      selectedText: window.getSelection()?.toString().trim() ?? "",
      sidebarMode: mode,
      sidebarOpen: true,
    });
  };

  useEffect(() => {
    let frame = 0;

    const updateToolbarPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const range = getCurrentSelectionRange();

        if (!range) {
          dismissedSelectionRangeRef.current = null;
          setState({
            selectedText: "",
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
          selectedText: window.getSelection()?.toString().trim() ?? "",
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
    <div
      className={`${getRepinThemeClass(theme)} repin-extension text-neutral-950 antialiased dark:text-neutral-50`}
    >
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
          position={state.toolbarPosition}
        />
      )}
      <RepinSidebar
        mode={state.sidebarMode}
        page={page}
        pinned={state.sidebarPinned}
        open={state.sidebarOpen}
        selectedText={state.selectedText}
        onClose={() => setState({ sidebarOpen: false })}
        onPinnedChange={(sidebarPinned) => setState({ sidebarPinned })}
      />
    </div>
  );
}

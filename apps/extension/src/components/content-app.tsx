import { useEffect, useMemo, useRef, useState } from "react";

import { getRepinThemeClass } from "@/lib/theme";
import { RepinSidebar } from "./repin-sidebar";
import { RepinToolbar } from "./repin-toolbar";
import { useRepinTheme } from "@/hooks/use-theme";
import { getCurrentSelectionRange, getSelectionToolbarPosition, isSameSelectionRange } from "@/lib/utils";
import { ToolbarPosition } from "@/types";


export function ContentApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolbarPosition, setToolbarPosition] =
    useState<ToolbarPosition | null>(null);
  const dismissedSelectionRangeRef = useRef<Range | null>(null);
  const theme = useRepinTheme();
  const page = useMemo(
    () => ({
      title: document.title,
      url: window.location.href,
    }),
    [],
  );

  const openSidebar = () => setSidebarOpen(true);

  useEffect(() => {
    let frame = 0;

    const updateToolbarPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const range = getCurrentSelectionRange();

        if (!range) {
          dismissedSelectionRangeRef.current = null;
          setToolbarPosition(null);
          return;
        }

        if (
          dismissedSelectionRangeRef.current &&
          isSameSelectionRange(range, dismissedSelectionRangeRef.current)
        ) {
          setToolbarPosition(null);
          return;
        }

        dismissedSelectionRangeRef.current = null;
        setToolbarPosition(getSelectionToolbarPosition(range));
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
  }, []);

  return (
    <div
      className={`${getRepinThemeClass(theme)} repin-extension text-neutral-950 antialiased dark:text-neutral-50`}
    >
      {toolbarPosition && (
        <RepinToolbar
          onChat={openSidebar}
          onClose={() => {
            dismissedSelectionRangeRef.current =
              getCurrentSelectionRange()?.cloneRange() ?? null;
            setToolbarPosition(null);
          }}
          onExplain={openSidebar}
          onSavePage={openSidebar}
          onSummarize={openSidebar}
          onTakeNote={openSidebar}
          onTranslateText={openSidebar}
          position={toolbarPosition}
        />
      )}
      <RepinSidebar
        page={page}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

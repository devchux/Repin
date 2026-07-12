import { useMemo, useState } from "react";

import { RepinSidebar } from "./repin-sidebar";
import { RepinToolbar } from "./repin-toolbar";

export function ContentApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = useMemo(
    () => ({
      title: document.title,
      url: window.location.href,
    }),
    [],
  );

  return (
    <div className="repin-extension text-neutral-950 antialiased">
      <RepinToolbar
        onAnnotate={() => setSidebarOpen(true)}
        onSave={() => setSidebarOpen(true)}
      />
      <RepinSidebar
        page={page}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

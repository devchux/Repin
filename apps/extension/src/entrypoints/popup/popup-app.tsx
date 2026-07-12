import { ExternalLink } from "lucide-react";

import { Button } from "@repo/ui/button";

export function PopupApp() {
  return (
    <main className="w-72 space-y-4 bg-white p-4 text-neutral-950">
      <div>
        <h1 className="text-base font-semibold">Repin</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Use the page toolbar to save or annotate the current tab.
        </p>
      </div>
      <Button className="w-full" variant="outline">
        <ExternalLink aria-hidden="true" />
        Open dashboard
      </Button>
    </main>
  );
}

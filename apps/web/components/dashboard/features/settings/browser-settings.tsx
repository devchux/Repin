import { Button } from "@repo/ui/button";
import { Wifi } from "@repo/ui/icons";
import { SectionHeading } from "./section-heading";

export function BrowserSettings() {
  return (
    <>
      <SectionHeading
        title="Browser connection"
        description="Manage extension sessions that can carry out browser actions."
      />
      <div className="mt-6 rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wifi />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">Chrome on this Mac</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Connected
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Extension 0.1 · Last active just now
            </p>
          </div>
          <Button variant="outline" size="sm">
            Disconnect
          </Button>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-dashed p-5">
        <h3 className="font-medium">Connect another browser</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Install the Repin extension and sign in with this account. Your
          browser will appear here automatically.
        </p>
        <Button className="mt-4" variant="outline">
          Get the extension
        </Button>
      </div>
    </>
  );
}

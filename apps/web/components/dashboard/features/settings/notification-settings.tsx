import { Bell, User, Wifi } from "@repo/ui/icons";
import { SectionHeading } from "./section-heading";
import { Toggle } from "./toggle";

export function NotificationSettings() {
  return (
    <>
      <SectionHeading
        title="Notifications"
        description="Decide which updates deserve your attention."
      />
      <div className="mt-2 divide-y">
        <Toggle
          icon={Bell}
          title="Assistant run updates"
          description="When a long-running task completes or needs approval."
          defaultChecked
        />
        <Toggle
          icon={Wifi}
          title="Browser connection"
          description="When the extension connects or goes offline."
          defaultChecked
        />
        <Toggle
          icon={User}
          title="Product updates"
          description="Occasional news about new Repin capabilities."
        />
      </div>
    </>
  );
}

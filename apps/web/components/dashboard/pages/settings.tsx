"use client";

import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { AppearanceSettings } from "@/components/dashboard/features/settings/appearance-settings";
import { BrowserSettings } from "@/components/dashboard/features/settings/browser-settings";
import { NotificationSettings } from "@/components/dashboard/features/settings/notification-settings";
import { ProfileSettings } from "@/components/dashboard/features/settings/profile-settings";
import { Button } from "@repo/ui/button";
import { Check, Save } from "@repo/ui/icons";
import { useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

const tabs = [
  "Profile",
  "Appearance",
  "Notifications",
  "Browser connection",
] as const;
type SettingsTab = (typeof tabs)[number];

export function SettingsPage({
  initialTab = "Profile",
}: {
  readonly initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [saved, setSaved] = useState(false);
  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Workspace"
        title="Settings"
        description="Manage your account, experience, and how Repin works across devices."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          className="flex gap-1 overflow-x-auto lg:flex-col"
          aria-label="Settings sections"
        >
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                setSaved(false);
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${tab === item ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <section className="max-w-3xl">
          {tab === "Profile" ? <ProfileSettings /> : null}
          {tab === "Appearance" ? <AppearanceSettings /> : null}
          {tab === "Notifications" ? <NotificationSettings /> : null}
          {tab === "Browser connection" ? <BrowserSettings /> : null}
          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <p className="text-xs text-muted-foreground">
              {tab === "Appearance" ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Check className="size-3" />
                  Appearance changes are saved automatically
                </span>
              ) : saved ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Check className="size-3" />
                  Changes saved
                </span>
              ) : (
                "Changes are stored for this workspace."
              )}
            </p>
            {tab === "Appearance" ? null : (
              <Button onClick={() => setSaved(true)}>
                <Save />
                Save changes
              </Button>
            )}
          </div>
        </section>
      </div>
    </WorkspacePage>
  );
}

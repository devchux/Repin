"use client";

import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { AppearanceSettings } from "@/components/dashboard/features/settings/appearance-settings";
import { BrowserSettings } from "@/components/dashboard/features/settings/browser-settings";
import { NotificationSettings } from "@/components/dashboard/features/settings/notification-settings";
import { ProfileSettings } from "@/components/dashboard/features/settings/profile-settings";
import { Button } from "@repo/ui/button";
import { Check, Save } from "@repo/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
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
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as SettingsTab);
          setSaved(false);
        }}
        className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]"
      >
        <TabsList
          className="h-auto w-full justify-start overflow-x-auto bg-transparent p-0 lg:flex-col lg:items-stretch"
          aria-label="Settings sections"
        >
          {tabs.map((item) => (
            <TabsTrigger
              key={item}
              value={item}
              className="h-auto flex-none justify-start border-0 px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none lg:w-full"
            >
              {item}
            </TabsTrigger>
          ))}
        </TabsList>
        <section className="max-w-3xl">
          <TabsContent value="Profile"><ProfileSettings /></TabsContent>
          <TabsContent value="Appearance"><AppearanceSettings /></TabsContent>
          <TabsContent value="Notifications"><NotificationSettings /></TabsContent>
          <TabsContent value="Browser connection"><BrowserSettings /></TabsContent>
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
      </Tabs>
    </WorkspacePage>
  );
}

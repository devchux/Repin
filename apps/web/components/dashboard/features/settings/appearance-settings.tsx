"use client";

import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/types/appearance";
import { Label } from "@repo/ui/label";
import { Check, Laptop, Moon, Sun } from "@repo/ui/icons";
import { SectionHeading } from "./section-heading";

const options: ReadonlyArray<{
  readonly name: string;
  readonly value: Theme;
  readonly icon: typeof Sun;
}> = [
  { name: "System", value: "system", icon: Laptop },
  { name: "Light", value: "light", icon: Sun },
  { name: "Dark", value: "dark", icon: Moon },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <SectionHeading
        title="Appearance"
        description="Choose how Repin looks on this device. Your selection is applied immediately."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {options.map(({ name, value, icon: Icon }) => (
          <button
            type="button"
            key={value}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={`rounded-xl border p-3 text-left transition-colors ${theme === value ? "border-primary ring-2 ring-primary/15" : "hover:bg-muted/30"}`}
          >
            <div
              className={`flex h-24 items-center justify-center rounded-lg border ${value === "dark" ? "bg-zinc-900 text-zinc-100" : value === "system" ? "bg-linear-to-r from-white from-50% to-zinc-900 text-primary" : "bg-white text-zinc-900"}`}
            >
              <Icon className="size-5" />
            </div>
            <span className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{name}</span>
              {theme === value ? (
                <Check className="size-4 text-primary" aria-hidden="true" />
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        System follows this device’s light or dark appearance. This preference
        is saved in this browser.
      </p>
      <div className="mt-8">
        <Label htmlFor="density">Content density</Label>
        <select
          id="density"
          className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm"
        >
          <option>Comfortable</option>
          <option>Compact</option>
        </select>
      </div>
    </>
  );
}

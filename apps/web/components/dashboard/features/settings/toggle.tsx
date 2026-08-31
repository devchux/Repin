"use client";

import { Bell } from "@repo/ui/icons";
import { useState } from "react";

export function Toggle({
  icon: Icon,
  title,
  description,
  defaultChecked,
}: {
  readonly icon: typeof Bell;
  readonly title: string;
  readonly description: string;
  readonly defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));

  return (
    <div className="flex items-center gap-4 py-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

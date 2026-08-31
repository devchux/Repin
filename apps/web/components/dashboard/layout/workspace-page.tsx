import { cn } from "@repo/ui/lib/utils";
import type { ComponentProps } from "react";

export function WorkspacePage({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-360 px-4 py-7 md:px-7 md:py-9 xl:px-10",
        className,
      )}
      {...props}
    />
  );
}

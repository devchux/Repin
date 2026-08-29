import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

function Avatar({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="avatar" className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full bg-secondary", className)} {...props} />;
}
function AvatarFallback({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="avatar-fallback" className={cn("flex size-full items-center justify-center text-xs font-semibold text-secondary-foreground", className)} {...props} />;
}
export { Avatar, AvatarFallback };

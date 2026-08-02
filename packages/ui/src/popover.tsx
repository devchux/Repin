"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import { cn } from "./lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

interface PopoverContentProps
  extends ComponentProps<typeof PopoverPrimitive.Content> {
  portalled?: boolean;
}

function PopoverContent({
  align = "center",
  className,
  portalled = true,
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  const content = (
    <PopoverPrimitive.Content
      align={align}
      className={cn(
        "z-50 rounded-md border border-neutral-200 bg-white p-4 text-neutral-950 shadow-md outline-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        className,
      )}
      sideOffset={sideOffset}
      {...props}
    />
  );

  if (!portalled) {
    return content;
  }

  return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };

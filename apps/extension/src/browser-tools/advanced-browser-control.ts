interface DebuggerGlobal {
  readonly chrome?: { readonly debugger?: unknown };
}

const declaresDebuggerPermission = () => {
  const manifest = browser.runtime.getManifest() as Browser.runtime.Manifest & {
    readonly optional_permissions?: readonly string[];
  };
  return [
    ...(manifest.permissions ?? []),
    ...(manifest.optional_permissions ?? []),
  ].includes("debugger");
};

export const getAdvancedBrowserControlAvailability = () => {
  if (!(globalThis as DebuggerGlobal).chrome?.debugger) {
    return {
      available: false,
      reason: "Advanced browser control is available in Chromium browsers.",
    } as const;
  }
  if (!declaresDebuggerPermission()) {
    return {
      available: false,
      reason:
        "Reload Repin from the browser's extensions page to activate its updated permissions.",
    } as const;
  }
  return { available: true } as const;
};

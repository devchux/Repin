import { extractPageObservation } from "../lib/page-observation";

interface ContentCommand {
  readonly type: "repin.browser.command";
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
}

let documentRevision = crypto.randomUUID();
const elements = new Map<string, Element>();
const consoleMessages: Array<Record<string, unknown>> = [];
const networkRequests: Array<Record<string, unknown>> = [];
let lastDialog: Record<string, unknown> | undefined;

document.documentElement.addEventListener("repin:page-observation", (event) => {
  if (!(event instanceof CustomEvent) || typeof event.detail !== "string")
    return;
  try {
    const observation = JSON.parse(event.detail) as Record<string, unknown>;
    if (observation.kind === "console") {
      const level = ["debug", "info", "warning", "error"].includes(
        String(observation.level),
      )
        ? String(observation.level)
        : "info";
      boundedPush(consoleMessages, {
        level,
        message: String(observation.message ?? "").slice(0, 4_000),
        source: String(observation.source ?? location.href).slice(0, 2_000),
        timestamp: String(observation.timestamp ?? new Date().toISOString()),
      });
    }
    if (
      observation.kind === "dialog" &&
      observation.dialog &&
      typeof observation.dialog === "object"
    ) {
      lastDialog = observation.dialog as Record<string, unknown>;
    }
  } catch (error) {
    console.debug("Repin ignored a malformed page observation", error);
  }
});

const boundedPush = (
  target: Array<Record<string, unknown>>,
  value: Record<string, unknown>,
) => {
  target.push(value);
  if (target.length > 500) target.shift();
};

for (const level of ["debug", "info", "warn", "error"] as const) {
  const original = console[level].bind(console);
  console[level] = (...values: unknown[]) => {
    boundedPush(consoleMessages, {
      level: level === "warn" ? "warning" : level,
      message: values
        .map((value) => (typeof value === "string" ? value : String(value)))
        .join(" ")
        .slice(0, 4_000),
      source: location.href,
      timestamp: new Date().toISOString(),
    });
    original(...values);
  };
}

new PerformanceObserver((list) => {
  for (const entry of list.getEntriesByType("resource")) {
    const resource = entry as PerformanceResourceTiming;
    boundedPush(networkRequests, {
      id: crypto.randomUUID(),
      url: resource.name,
      method: "GET",
      resourceType: resource.initiatorType || "other",
      status: resource.responseStatus || undefined,
      startedAt: new Date(
        performance.timeOrigin + resource.startTime,
      ).toISOString(),
      completedAt: new Date(
        performance.timeOrigin + resource.responseEnd,
      ).toISOString(),
      pending: resource.responseEnd === 0,
      failed: resource.responseStatus >= 400,
    });
  }
}).observe({ type: "resource", buffered: true });

const invalidateDocument = () => {
  documentRevision = crypto.randomUUID();
  elements.clear();
};

let scheduledInvalidation: ReturnType<typeof setTimeout> | undefined;
const scheduleDocumentInvalidation = () => {
  if (scheduledInvalidation) return;
  scheduledInvalidation = setTimeout(() => {
    scheduledInvalidation = undefined;
    invalidateDocument();
  }, 50);
};

new MutationObserver((mutations) => {
  if (
    mutations.some(
      (mutation) =>
        mutation.type === "childList" ||
        mutation.type === "characterData" ||
        mutation.type === "attributes",
    )
  ) {
    scheduleDocumentInvalidation();
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: [
    "aria-label",
    "aria-hidden",
    "aria-expanded",
    "aria-disabled",
    "checked",
    "disabled",
    "hidden",
    "href",
    "role",
    "style",
    "value",
  ],
});

const invalidateNavigation = () => {
  if (scheduledInvalidation) {
    clearTimeout(scheduledInvalidation);
    scheduledInvalidation = undefined;
  }
  invalidateDocument();
};

const originalPushState = history.pushState.bind(history);
history.pushState = (data, unused, url) => {
  originalPushState(data, unused, url);
  invalidateNavigation();
};
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (data, unused, url) => {
  originalReplaceState(data, unused, url);
  invalidateNavigation();
};
addEventListener("popstate", invalidateNavigation);
addEventListener("hashchange", invalidateNavigation);

const refFor = (element: Element, index: number) => {
  const ref = `e${index + 1}`;
  elements.set(ref, element);
  return ref;
};

const elementFor = (input: Readonly<Record<string, unknown>>) => {
  if (input.documentRevision !== documentRevision)
    throw new Error("Snapshot is stale");
  const element = elements.get(String(input.ref));
  if (!element || !element.isConnected)
    throw new Error("Element reference is unavailable");
  return element as HTMLElement;
};

const snapshot = (input: Readonly<Record<string, unknown>>) => {
  elements.clear();
  const maximum = Number(input.maxElements ?? 500);
  const candidates = Array.from(
    document.querySelectorAll(
      "a,button,input,select,textarea,[role],[contenteditable='true']",
    ),
  );
  const tabId = String(input.tabId ?? "");
  const references = new Map<Element, string>();
  const snapshotElements = candidates
    .slice(0, maximum)
    .map((element, index) => {
      const ref = refFor(element, index);
      references.set(element, ref);
      return {
        ref,
        role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
        name:
          element.getAttribute("aria-label") ??
          (element as HTMLElement).innerText?.trim() ??
          undefined,
        value:
          "value" in element &&
          (element as HTMLInputElement).type !== "password"
            ? String((element as HTMLInputElement).value)
            : undefined,
        disabled:
          "disabled" in element
            ? Boolean((element as HTMLInputElement).disabled)
            : undefined,
        focused: document.activeElement === element,
      };
    });
  const observation = input.includeText
    ? {
        ...extractPageObservation(documentRevision, (element) =>
          references.get(element),
        ),
        tabId,
      }
    : undefined;
  const groundedRefs = new Set(
    observation?.interactiveElements?.flatMap(({ actionRef }) =>
      actionRef ? [actionRef] : [],
    ) ?? [],
  );
  const observedRefs = new Set(
    observation?.interactiveElements?.flatMap((observedElement) =>
      snapshotElements
        .filter(
          ({ role, name }) =>
            role === observedElement.role && name === observedElement.name,
        )
        .map(({ ref }) => ref),
    ) ?? [],
  );
  return {
    tabId,
    documentRevision,
    url: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },
    elements: snapshotElements.map((element) => ({
      ...element,
      groundingStatus: !observation
        ? "unavailable"
        : groundedRefs.has(element.ref)
          ? "grounded"
          : observedRefs.has(element.ref)
            ? "ambiguous"
            : "unavailable",
    })),
    text: input.includeText
      ? document.body.innerText.slice(0, 100_000)
      : undefined,
    observation,
    truncated: candidates.length > maximum,
  };
};

export const handleContentCommand = async (
  message: ContentCommand,
): Promise<unknown> => {
  if (message.type !== "repin.browser.command") return undefined;
  const input = message.input;
  switch (message.name) {
    case "browser_get_snapshot":
      return snapshot(input);
    case "browser_get_page_metadata":
      return {
        tabId: String(input.tabId ?? ""),
        documentRevision,
        url: location.href,
        title: document.title,
        description:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") ?? undefined,
        canonicalUrl:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href") ?? undefined,
        language: document.documentElement.lang || undefined,
        contentType: document.contentType,
        readyState: document.readyState,
        capturedAt: new Date().toISOString(),
      };
    case "browser_get_selected_text":
      return {
        tabId: String(input.tabId ?? ""),
        documentRevision,
        text: getSelection()?.toString() ?? "",
        collapsed: getSelection()?.isCollapsed ?? true,
      };
    case "browser_get_element": {
      const element = elementFor(input);
      const bounds = element.getBoundingClientRect();
      return {
        ref: input.ref,
        tabId: String(input.tabId ?? ""),
        documentRevision,
        role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
        name: element.getAttribute("aria-label") ?? element.innerText,
        text: element.innerText,
        visible: bounds.width > 0 && bounds.height > 0,
        editable:
          element.isContentEditable ||
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement,
        attributes: Object.fromEntries(
          Array.from(element.attributes)
            .filter(({ name }) => !name.startsWith("on"))
            .map(({ name, value }) => [
              name,
              name === "value" ? "[redacted]" : value,
            ]),
        ),
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        actions: [],
      };
    }
    case "browser_get_forms":
      return {
        tabId: String(input.tabId ?? ""),
        documentRevision,
        forms: Array.from(document.forms)
          .slice(0, Number(input.maxForms ?? 100))
          .map((form, formIndex) => ({
            ref: refFor(form, 10_000 + formIndex),
            name: form.name || undefined,
            action: form.action,
            method: form.method,
            fields: Array.from(form.elements)
              .filter(
                (
                  field,
                ): field is
                  | HTMLInputElement
                  | HTMLSelectElement
                  | HTMLTextAreaElement =>
                  field instanceof HTMLInputElement ||
                  field instanceof HTMLSelectElement ||
                  field instanceof HTMLTextAreaElement,
              )
              .map((field, index) => ({
                ref: refFor(field, 20_000 + formIndex * 1000 + index),
                name: field.name,
                type:
                  field instanceof HTMLInputElement
                    ? field.type
                    : field.tagName.toLowerCase(),
                value:
                  field instanceof HTMLInputElement && field.type === "password"
                    ? undefined
                    : field.value,
                redacted:
                  field instanceof HTMLInputElement &&
                  field.type === "password",
                required: field.required,
                disabled: field.disabled,
                valid: field.validity.valid,
                validationMessage: field.validationMessage || undefined,
              })),
          })),
        truncated: document.forms.length > Number(input.maxForms ?? 100),
      };
    case "browser_get_navigation_state":
      return {
        tabId: String(input.tabId ?? ""),
        url: location.href,
        loading: document.readyState === "loading",
        canGoBack: history.length > 1,
        canGoForward: false,
        readyState: document.readyState,
      };
    case "browser_get_frames":
      return {
        tabId: String(input.tabId ?? ""),
        frames: Array.from(document.querySelectorAll("iframe")).map(
          (frame, index) => ({
            id: String(index),
            url: frame.src,
            origin: new URL(frame.src || location.href, location.href).origin,
            name: frame.name || undefined,
            accessible: Boolean(frame.contentDocument),
          }),
        ),
      };
    case "browser_get_storage_summary":
      return Promise.all([
        typeof indexedDB.databases === "function" ? indexedDB.databases() : [],
      ]).then(([databases]) => ({
        tabId: String(input.tabId ?? ""),
        origin: location.origin,
        cookies: { count: 0 },
        localStorage: {
          keyCount: localStorage.length,
          keys: Object.keys(localStorage),
        },
        sessionStorage: {
          keyCount: sessionStorage.length,
          keys: Object.keys(sessionStorage),
        },
        indexedDb: {
          databaseCount: databases.length,
          names: databases.flatMap(({ name }) => (name ? [name] : [])),
        },
      }));
    case "browser_get_dialog":
      return { tabId: String(input.tabId ?? ""), open: false, ...lastDialog };
    case "browser_get_console_messages":
      return {
        tabId: String(input.tabId ?? ""),
        messages: consoleMessages.slice(-Number(input.limit ?? 100)),
        truncated: consoleMessages.length > Number(input.limit ?? 100),
      };
    case "browser_get_network_activity":
      return {
        tabId: String(input.tabId ?? ""),
        requests: networkRequests.slice(-Number(input.limit ?? 100)),
        pendingCount: performance
          .getEntriesByType("resource")
          .filter((entry) => entry.duration === 0).length,
        truncated: networkRequests.length > Number(input.limit ?? 100),
      };
    case "browser_click":
      elementFor(input).click();
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    case "browser_double_click":
      elementFor(input).dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true }),
      );
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    case "browser_hover":
      elementFor(input).dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true }),
      );
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    case "browser_focus":
      elementFor(input).focus();
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    case "browser_clear":
    case "browser_fill": {
      const element = elementFor(input) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      element.value =
        message.name === "browser_clear" ? "" : String(input.text ?? "");
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: String(input.text ?? ""),
        }),
      );
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_type": {
      const element = elementFor(input) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      element.value += String(input.text ?? "");
      element.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_check":
    case "browser_uncheck": {
      const element = elementFor(input) as HTMLInputElement;
      element.checked = message.name === "browser_check";
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_select_option": {
      const element = elementFor(input) as HTMLSelectElement;
      const values = (input.values as string[] | undefined) ?? [];
      for (const option of element.options)
        option.selected = values.includes(option.value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_scroll":
      if (input.ref) {
        elementFor(input).scrollIntoView({
          behavior: input.behavior as ScrollBehavior | undefined,
          block: input.block as ScrollLogicalPosition | undefined,
        });
      } else {
        scrollBy({
          left: Number(input.deltaX ?? 0),
          top: Number(input.deltaY ?? 0),
          behavior: input.behavior as ScrollBehavior | undefined,
        });
      }
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    case "browser_drag_and_drop": {
      if (input.documentRevision !== documentRevision)
        throw new Error("Snapshot is stale");
      const source = elements.get(String(input.sourceRef));
      const target = elements.get(String(input.targetRef));
      if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement))
        throw new Error("Drag source or target is unavailable");
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("dragenter", { bubbles: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
      target.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
      source.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, dataTransfer }),
      );
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_upload_files": {
      const element = elementFor(input);
      if (!(element instanceof HTMLInputElement) || element.type !== "file") {
        throw new Error("Referenced element is not a file input");
      }
      const transfer = new DataTransfer();
      const staged = input.files as Array<{
        dataBase64: string;
        name: string;
        type: string;
      }>;
      for (const file of staged) {
        const bytes = Uint8Array.from(atob(file.dataBase64), (character) =>
          character.charCodeAt(0),
        );
        transfer.items.add(new File([bytes], file.name, { type: file.type }));
      }
      element.files = transfer.files;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
        fileCount: transfer.files.length,
      };
    }
    case "browser_copy": {
      const element = elementFor(input);
      return {
        success: true,
        content:
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
            ? element.value
            : (element.textContent ?? ""),
      };
    }
    case "browser_paste": {
      const element = elementFor(input) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      const text = String(input.text ?? "");
      element.focus();
      element.setRangeText(
        text,
        element.selectionStart ?? element.value.length,
        element.selectionEnd ?? element.value.length,
        "end",
      );
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertFromPaste",
          data: text,
        }),
      );
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    }
    case "browser_download": {
      const element = elementFor(input);
      const url =
        element instanceof HTMLAnchorElement
          ? element.href
          : element.getAttribute("src");
      if (!url) throw new Error("Referenced element has no downloadable URL");
      return { success: true, url };
    }
    case "browser_wait": {
      const timeoutMs = Number(input.timeoutMs ?? 10_000);
      const startedAt = Date.now();
      const initialUrl = String(input.url ?? location.href);
      const satisfied = () => {
        switch (input.condition) {
          case "element_visible": {
            const bounds = elementFor(input).getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
          }
          case "element_hidden": {
            try {
              const bounds = elementFor(input).getBoundingClientRect();
              return bounds.width === 0 || bounds.height === 0;
            } catch {
              return true;
            }
          }
          case "text_present":
            return document.body.innerText.includes(String(input.text));
          case "url_changed":
            return location.href !== initialUrl;
          case "navigation_completed":
            return document.readyState === "complete";
          case "network_idle":
            return performance
              .getEntriesByType("resource")
              .every((entry) => entry.duration > 0);
          default:
            return false;
        }
      };
      while (!satisfied()) {
        if (Date.now() - startedAt >= timeoutMs)
          throw new Error(`Timed out waiting for ${String(input.condition)}`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        condition: input.condition,
        elapsedMs: Date.now() - startedAt,
      };
    }
    case "browser_submit_form":
      (elementFor(input) as HTMLFormElement).requestSubmit();
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
    default:
      throw new Error(`${message.name} requires a native or debugger handler`);
  }
};

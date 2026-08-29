interface ContentCommand {
  readonly type: "repin.browser.command";
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
}

let documentRevision = crypto.randomUUID();
const elements = new Map<string, Element>();

const invalidateDocument = () => {
  documentRevision = crypto.randomUUID();
  elements.clear();
};

new MutationObserver(invalidateDocument).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

const originalPushState = history.pushState.bind(history);
history.pushState = (data, unused, url) => {
  originalPushState(data, unused, url);
  invalidateDocument();
};
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (data, unused, url) => {
  originalReplaceState(data, unused, url);
  invalidateDocument();
};
addEventListener("popstate", invalidateDocument);
addEventListener("hashchange", invalidateDocument);

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
  return {
    tabId: String(input.tabId ?? ""),
    documentRevision,
    url: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },
    elements: candidates.slice(0, maximum).map((element, index) => ({
      ref: refFor(element, index),
      role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
      name:
        element.getAttribute("aria-label") ??
        (element as HTMLElement).innerText?.trim() ??
        undefined,
      value:
        "value" in element && (element as HTMLInputElement).type !== "password"
          ? String((element as HTMLInputElement).value)
          : undefined,
      disabled:
        "disabled" in element
          ? Boolean((element as HTMLInputElement).disabled)
          : undefined,
      focused: document.activeElement === element,
    })),
    text: input.includeText
      ? document.body.innerText.slice(0, 100_000)
      : undefined,
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
      return {
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
        indexedDb: { databaseCount: 0, names: [] },
      };
    case "browser_get_dialog":
      return { tabId: String(input.tabId ?? ""), open: false };
    case "browser_get_console_messages":
      return {
        tabId: String(input.tabId ?? ""),
        messages: [],
        truncated: false,
      };
    case "browser_get_network_activity":
      return {
        tabId: String(input.tabId ?? ""),
        requests: [],
        pendingCount: 0,
        truncated: false,
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
      elementFor(input).scrollIntoView({
        behavior: input.behavior as ScrollBehavior | undefined,
        block: input.block as ScrollLogicalPosition | undefined,
      });
      return {
        success: true,
        tabId: String(input.tabId ?? ""),
        documentRevision,
      };
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

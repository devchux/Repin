import type { SavedHighlight } from "@repo/contracts/highlight";
import { REPIN_PROTOCOL_VERSION } from "@repo/contracts/messages";
import { listHighlights } from "../lib/highlight-client";
import { PageHighlightRenderer } from "../lib/page-highlight-renderer";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main(ctx) {
    if (window.top !== window) return;
    if (!document.body) return;
    const renderer = new PageHighlightRenderer();
    if (!renderer.supported) return;

    let currentUrl = window.location.href;
    let saved: SavedHighlight[] = [];
    let revision = 0;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;

    const render = () => renderer.render(saved);
    const scheduleRender = () => {
      if (!saved.length) return;
      clearTimeout(renderTimer);
      renderTimer = setTimeout(render, 750);
    };

    const load = async () => {
      const requestedUrl = window.location.href;
      const requestRevision = ++revision;
      const items: SavedHighlight[] = [];
      try {
        let page = 1;
        let pageCount = 1;
        while (page <= pageCount && page <= 10) {
          const result = await listHighlights(requestedUrl, page);
          if (requestRevision !== revision) return;
          items.push(...result.items);
          pageCount = result.pageCount;
          page += 1;
        }
        if (
          requestRevision !== revision ||
          requestedUrl !== window.location.href
        )
          return;
        const fetchedIds = new Set(items.map((item) => item.id));
        saved = [
          ...items,
          ...saved.filter(
            (item) => !fetchedIds.has(item.id) && item.url === requestedUrl,
          ),
        ];
        currentUrl = requestedUrl;
        render();
      } catch (error) {
        if (requestRevision !== revision) return;
        if (saved.length) render();
        else renderer.clear();
        console.debug("Repin could not load this page's highlights", error);
      }
    };

    const onMessage = (message: unknown) => {
      if (
        !message ||
        typeof message !== "object" ||
        !("protocolVersion" in message) ||
        message.protocolVersion !== REPIN_PROTOCOL_VERSION ||
        !("type" in message) ||
        message.type !== "repin.highlight.saved" ||
        !("payload" in message)
      )
        return;
      const highlight = message.payload as SavedHighlight;
      if (highlight.url !== window.location.href) return;
      saved = [...saved.filter((item) => item.id !== highlight.id), highlight];
      scheduleRender();
    };

    browser.runtime.onMessage.addListener(onMessage);
    const observer = new MutationObserver(() => scheduleRender());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    const checkUrl = () => {
      if (window.location.href !== currentUrl) {
        renderer.clear();
        saved = [];
        currentUrl = window.location.href;
        void load();
      }
    };
    const navigationTimer = setInterval(checkUrl, 1000);
    window.addEventListener("popstate", checkUrl);
    window.addEventListener("hashchange", checkUrl);
    void load();

    ctx.onInvalidated(() => {
      revision += 1;
      clearTimeout(renderTimer);
      clearInterval(navigationTimer);
      observer.disconnect();
      renderer.clear();
      browser.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener("popstate", checkUrl);
      window.removeEventListener("hashchange", checkUrl);
    });
  },
});

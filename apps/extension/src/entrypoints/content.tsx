import ReactDOM from "react-dom/client";

import "../assets/tailwind.css";
import { ContentApp } from "../components/content-app";
import { handleContentCommand } from "../browser-tools/content-command-handler";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    browser.runtime.onMessage.addListener(handleContentCommand);
    const ui = await createShadowRootUi(ctx, {
      name: "repin-toolbar",
      position: "inline",
      anchor: "body",
      isolateEvents: true,
      onMount(container) {
        const app = document.createElement("div");
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(<ContentApp />);

        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

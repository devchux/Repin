import ReactDOM from "react-dom/client";

import "../assets/tailwind.css";
import { ContentApp } from "../components/content-app";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
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

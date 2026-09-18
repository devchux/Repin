import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    name: "Repin",
    description:
      "Understand, remember, and safely act on information from the web.",
    permissions: [
      "identity",
      "contextMenus",
      "storage",
      "tabs",
      "sessions",
      "downloads",
      "cookies",
      "scripting",
      "webNavigation",
    ],
    ...(browser === "firefox"
      ? {}
      : { optional_permissions: ["debugger"] as never[] }),
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Repin",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      96: "icon/96.png",
      128: "icon/128.png",
    },
    browser_specific_settings: {
      gecko: {
        id: "repin@filia.local",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

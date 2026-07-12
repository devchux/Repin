import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: 'src',
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Repin",
    description: "Save, annotate, and organize useful pages from anywhere.",
    permissions: ["storage"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Repin",
    },
    browser_specific_settings: {
      gecko: {
        id: "repin@filia.local",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

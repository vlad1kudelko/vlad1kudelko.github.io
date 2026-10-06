import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://vlad1kudelko.github.io",
  integrations: [mdx(), sitemap({ filter: page => !page.endsWith('/privacy/') })],

  vite: {
    plugins: [tailwindcss()],
  },
});

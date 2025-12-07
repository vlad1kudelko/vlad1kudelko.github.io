import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
    site: 'https://vlad1kudelko.github.io',
    integrations: [mdx(), sitemap(), pagefind()],

    vite: {
        plugins: [tailwindcss()],
    },
});

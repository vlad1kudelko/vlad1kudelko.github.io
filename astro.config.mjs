import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
    site: 'https://crafthomelab.ru',
    integrations: [mdx(), sitemap(), pagefind()],

    vite: {
        plugins: [tailwindcss()],
    },
});

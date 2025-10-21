import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    site: 'https://crafthomelab.ru',
    integrations: [mdx(), sitemap()],

    vite: {
        plugins: [tailwindcss()],
    },
});

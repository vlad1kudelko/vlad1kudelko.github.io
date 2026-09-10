import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
    '/src/assets/ai/*.{png,jpg,jpeg,webp}',
    { eager: true },
);

export const logos: Record<string, ImageMetadata> = Object.fromEntries(
    Object.entries(files).map(([path, mod]) => [
        path.split('/').pop()!.replace(/\.[^.]+$/, ''),
        mod.default,
    ]),
);

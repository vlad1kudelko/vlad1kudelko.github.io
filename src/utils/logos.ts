import type { ImageMetadata } from 'astro';

// import.meta.glob требует статический литерал пути на месте вызова —
// поэтому каждая директория логотипов собирается своим вызовом.
const toLogoMap = (files: Record<string, { default: ImageMetadata }>): Record<string, ImageMetadata> =>
    Object.fromEntries(
        Object.entries(files).map(([path, mod]) => [
            path.split('/').pop()!.replace(/\.[^.]+$/, ''),
            mod.default,
        ]),
    );

export const aiLogos = toLogoMap(import.meta.glob<{ default: ImageMetadata }>(
    '/src/assets/ai/*.{png,jpg,jpeg,webp}',
    { eager: true },
));

export const hostingLogos = toLogoMap(import.meta.glob<{ default: ImageMetadata }>(
    '/src/assets/hosting/*.{png,jpg,jpeg,webp}',
    { eager: true },
));

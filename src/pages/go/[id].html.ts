import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Генерирует dist/go/<id>.html — meta-refresh на партнёрскую ссылку.
// Источники: providers.yaml + hostings.yaml (ref провайдера) + links.yaml (простые редиректы).

const redirectHtml = (url: string) => `\
<head>
    <meta http-equiv="refresh" content="0;URL=${url}" />
</head>
`;

export async function getStaticPaths() {
    const [aiProviders, hostingProviders, links] = await Promise.all([
        getCollection('aiProviders'),
        getCollection('hostingProviders'),
        getCollection('links'),
    ]);
    return [...aiProviders, ...hostingProviders, ...links].map((e) => ({
        params: { id: e.id },
        props: { ref: e.data.ref },
    }));
}

export const GET: APIRoute = ({ props }) =>
    new Response(redirectHtml(props.ref as string), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

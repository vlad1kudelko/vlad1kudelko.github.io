import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { file } from 'astro/loaders';
import { load as yamlLoad } from 'js-yaml';

const posts = defineCollection({
    loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        heroImage: image().optional(),
        github: z.string().optional(),
        tags: z.string().optional(),
    }),
});

const docs = defineCollection({
    loader: glob({ base: './src/content/docs', pattern: '**/*.{md,mdx}' }),
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        order: z.number(),
        official: z.string().optional(),
    }),
});

// file()-лоадер ключует записи массива по их полю id — оно и есть slug в URL.
const parseYaml = (text: string) => yamlLoad(text) as unknown[];

// статус генерации: по подписке / по токенам / и так, и так / нельзя / null — не проверено
const genStatus = z.enum(['subscription', 'tokens', 'both', 'no']).nullable();

const providers = defineCollection({
    loader: file('src/data/providers.yaml', { parser: parseYaml }),
    schema: z.object({
        name: z.string(),
        ref: z.string().url(),
        summary: z.string(),
        // логотип не в схеме: файл src/assets/ai/<id>.{png,jpg,webp} подхватывается по id

        registration: z.array(z.enum([
            'email',
            'github',
            'google',
            'metamask',
            'phone',
            'telegram',
            'vk',
            'yandex',
        ])),
        // null — не проверено / не ясно
        crypto: z.boolean().nullable(),
        ruCards: z.boolean().nullable(),
        vpn: z.boolean().default(false),

        genText: genStatus,
        genImage: genStatus,
        genVideo: genStatus,
        genMusic: genStatus,

        order: z.number(),
        lastChecked: z.coerce.date(),
    }),
});

// Простые редиректы /go/<id>, вынесены из public/go/*.html
const links = defineCollection({
    loader: file('src/data/links.yaml', { parser: parseYaml }),
    schema: z.object({
        ref: z.string(),
    }),
});

export const collections = { posts, docs, providers, links };

import { z } from 'astro/zod';
import rawTrends from '../data/tech_trends.json';
import rawDirections from '../data/directions.json';

const trendsSchema = z.array(z.object({
    category: z.string(),
    types: z.array(z.object({
        type: z.string().nullable(),
        items: z.array(z.object({
            title: z.string(),
            title_url: z.string().min(1),
            analytics: z.array(z.object({
                date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
                count: z.number().int().nonnegative(),
            })),
        })),
    })),
}));

const directionsSchema = z.array(z.object({
    id: z.string().regex(/^\d{5}$/),
    label: z.string(),
    techs: z.array(z.string()).min(1),
}));

export type Tech = {
    id: string;
    name: string;
    counts: (number | null)[];
    current: number | null;
    yearAgo: number | null;
};

export type DirectionTech = Tech & { share: number };

export type Direction = {
    id: string;
    label: string;
    techs: DirectionTech[];
};

export type Category = {
    id: string;
    name: string;
    types: { name: string | null; techs: Tech[] }[];
    techs: Tech[];
};

let cache: ReturnType<typeof load> | undefined;

export function loadStack() {
    cache ??= load();
    return cache;
}

const byCurrent = (a: Tech, b: Tech) => (b.current ?? -1) - (a.current ?? -1);

function load() {
    const trends = trendsSchema.parse(rawTrends);
    const directions = directionsSchema.parse(rawDirections);
    const errors: string[] = [];

    const items = trends.flatMap(c => c.types.flatMap(t => t.items));
    const months = [...new Set(items.flatMap(i => i.analytics.map(a => a.date.slice(0, 7))))].sort();
    const lastMonth = months[months.length - 1];
    const yearAgoMonth = `${Number(lastMonth.slice(0, 4)) - 1}${lastMonth.slice(4)}`;

    const techs = new Map<string, Tech>();
    for (const item of items) {
        if (techs.has(item.title_url)) errors.push(`tech_trends.json: дубликат технологии ${item.title_url}`);
        const byMonth = new Map(item.analytics.map(a => [a.date.slice(0, 7), a.count]));
        techs.set(item.title_url, {
            id: item.title_url,
            name: item.title,
            counts: months.map(p => byMonth.get(p) ?? null),
            current: byMonth.get(lastMonth) ?? null,
            yearAgo: byMonth.get(yearAgoMonth) ?? null,
        });
    }

    const categories: Category[] = trends.map((c, ci) => {
        const types = c.types.map(t => ({ name: t.type, techs: t.items.map(i => techs.get(i.title_url)!).sort(byCurrent) }));
        return { id: `c${ci + 1}`, name: c.category, types, techs: types.flatMap(t => t.techs).sort(byCurrent) };
    });

    const seen = new Set<string>();
    const result: Direction[] = directions.map(d => {
        if (seen.has(d.id)) errors.push(`directions.json: дубликат id ${d.id}`);
        seen.add(d.id);
        const list = d.techs.flatMap(id => {
            const t = techs.get(id);
            if (!t) errors.push(`directions.json: ${d.id} ссылается на неизвестную технологию ${id}`);
            return t && t.current !== null ? [t] : [];
        });
        const sum = list.reduce((s, t) => s + t.current!, 0);
        return {
            id: d.id,
            label: d.label,
            techs: list.map(t => ({ ...t, share: sum ? t.current! / sum : 0 })).sort((a, b) => b.share - a.share),
        };
    });

    if (errors.length) {
        throw new Error(`Данные раздела /study/stack/ не в порядке:\n  ${errors.join('\n  ')}`);
    }

    return { months, lastMonth, directions: result, categories };
}


const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const splitMonth = (period: string) => {
    const [y, m] = period.split('-');
    return { year: y, idx: Number(m) - 1 };
};

export function periodShort(period: string): string {
    const { year, idx } = splitMonth(period);
    return `${MONTHS_SHORT[idx]} ${year}`;
}



const intFmt = new Intl.NumberFormat('ru-RU');

export const formatInt = (n: number) => intFmt.format(n);

export const formatShare = (share: number) => `${(share * 100).toFixed(1).replace('.', ',')}%`;

export const yearChange = (t: Tech) => (t.current === null || !t.yearAgo ? null : t.current / t.yearAgo - 1);

export function formatChange(change: number): string {
    const v = Math.round(change * 100);
    return v > 0 ? `+${v}%` : v < 0 ? `−${-v}%` : '0%';
}

export function plural(n: number, forms: [string, string, string]): string {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
    return forms[2];
}

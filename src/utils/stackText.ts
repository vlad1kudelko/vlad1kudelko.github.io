import { formatChange, formatInt, formatShare, yearChange, type Category, type Direction, type Tech } from './stack';

const MIN_FOR_TREND = 100;

const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}`);
const withCount = (t: Tech) => `${t.name} (${formatInt(t.current!)})`;
const ranked = (techs: Tech[]) => techs.filter(t => t.current !== null);

export function directionSummary(d: Direction): string {
    const top = d.techs.slice(0, 3);
    const sum = top.reduce((s, t) => s + t.share, 0);
    return `Основа направления — ${list(top.map(t => t.name))}: на них приходится ${formatShare(sum)} упоминаний.`;
}

export function categorySummary(c: Category): string {
    const top = ranked(c.techs).slice(0, 3);
    const parts = [`Больше всего вакансий: ${list(top.map(withCount))}.`];

    const trends = ranked(c.techs)
        .filter(t => t.current! >= MIN_FOR_TREND)
        .map(t => ({ t, change: yearChange(t) }))
        .filter((x): x is { t: Tech; change: number } => x.change !== null)
        .sort((a, b) => b.change - a.change);

    if (trends.length >= 2) {
        const best = trends[0];
        const worst = trends[trends.length - 1];
        parts.push(`За год: лучшая динамика — ${best.t.name} (${formatChange(best.change)}), худшая — ${worst.t.name} (${formatChange(worst.change)}).`);
    }
    return parts.join(' ');
}

export type Faq = { question: string; answer: string };

export function buildFaq(directions: Direction[], categories: Category[]): Faq[] {
    const faq: Faq[] = [];
    const languages = categories.find(c => c.name === 'Языки');
    const frontend = directions.find(d => d.id === '10001');
    const devops = directions.find(d => d.id === '10005');
    const python = categories.flatMap(c => c.types).find(t => t.name === 'Python');

    if (languages) {
        faq.push({
            question: 'Какой язык программирования самый востребованный?',
            answer: `Больше всего вакансий упоминают ${list(ranked(languages.techs).slice(0, 4).map(withCount))}.`,
        });
    }
    if (frontend) {
        faq.push({
            question: 'Какие технологии нужны фронтенд-разработчику?',
            answer: `Чаще всего в вакансиях фронтенда требуют ${list(frontend.techs.slice(0, 5).map(t => t.name))}.`,
        });
    }
    if (devops) {
        faq.push({
            question: 'Что нужно знать DevOps-инженеру?',
            answer: `В вакансиях DevOps чаще всего встречаются ${list(devops.techs.slice(0, 6).map(t => t.name))}.`,
        });
    }
    if (python) {
        faq.push({
            question: 'Какие Python-библиотеки чаще всего требуют в вакансиях?',
            answer: `Лидируют ${list(ranked(python.techs).slice(0, 5).map(withCount))}.`,
        });
    }
    if (languages) {
        const both = languages.techs.filter(t => t.current !== null && t.yearAgo);
        const now = both.reduce((s, t) => s + t.current!, 0);
        const before = both.reduce((s, t) => s + t.yearAgo!, 0);
        if (before) {
            const change = now / before - 1;
            faq.push({
                question: 'Растёт ли спрос на разработчиков?',
                answer: `За год суммарное число упоминаний языков программирования в вакансиях ${change < 0 ? 'снизилось' : 'выросло'} на ${formatChange(Math.abs(change)).replace('+', '')}.`,
            });
        }
    }
    return faq;
}

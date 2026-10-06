/**
 * Тело страницы старой вёрстки → список блоков. Каждый типизированный блок
 * проверяется обратным рендером: React-компонент из распознанных данных
 * должен дать ту же разметку (в канонической форме), что и исходная секция.
 * Не совпало — секция остаётся блоком «HTML как есть».
 */
import { parseFragment } from 'parse5';
import type { Block } from '@mtpk/content-model';
import { canonHtml, firstDifference } from '@mtpk/content-kit/canon';
import { stripHtmlComments } from '@mtpk/content-kit';
import { renderBlockToHtml } from '@mtpk/ui/server';
import { classList, isEl, Mismatch, outer, textOf, type El, type Node } from './dom.ts';
import { PARSERS } from './parsers.ts';

/** Маркеры <!--C:имя--> → блоки. */
const MARKERS: Record<string, Block> = {
  leadgen: { type: 'leadgen' },
  'best-offer': { type: 'bestOffer' },
  'catalog-cta': { type: 'catalogCta' },
  partner: { type: 'partner' },
  adv: { type: 'adv' },
  'adv-12': { type: 'adv', warranty: '12 месяцев' },
  'adv-chiller': { type: 'adv', warranty: '12 месяцев' },
  'why-us': { type: 'whyUs', months: 18 },
  'why-us-12': { type: 'whyUs', months: 12 },
  'why-us-6': { type: 'whyUs', months: 6 },
};

export interface ConvertReport {
  typed: Record<string, number>;
  fallback: Record<string, number>;
  /** причины несовпадения по ключам секций (первые несколько) */
  reasons: Record<string, string[]>;
}

export function newReport(): ConvertReport {
  return { typed: {}, fallback: {}, reasons: {} };
}

const keyOf = (el: El) => `${el.tagName}${classList(el)[0] ? `.${classList(el)[0]}` : ''}`;

function hasMarker(el: El): boolean {
  return (el.childNodes as Node[]).some(
    (c) => (c.nodeName === '#comment' && /^C:[a-z0-9-]+$/.test((c as unknown as { data: string }).data)) || (isEl(c) && hasMarker(c)),
  );
}

function note(report: ConvertReport, key: string, reason: string) {
  report.fallback[key] = (report.fallback[key] ?? 0) + 1;
  const list = (report.reasons[key] ??= []);
  if (list.length < 6) list.push(reason);
}

function convertNodes(nodes: Node[], path: string, report: ConvertReport, verify: boolean): Block[] {
  const blocks: Block[] = [];
  for (const n of nodes) {
    if (n.nodeName === '#comment') {
      const data = (n as unknown as { data: string }).data;
      const m = data.match(/^C:([a-z0-9-]+)$/);
      if (m && MARKERS[m[1]]) blocks.push(structuredClone(MARKERS[m[1]]));
      continue;
    }
    if (!isEl(n)) {
      const t = textOf(n);
      if (t.trim()) blocks.push({ type: 'text', text: t });
      continue;
    }
    // Скрипт лайтбокса сразу после блока lightbox — поведение теперь в компоненте
    const prev = blocks[blocks.length - 1];
    if (n.tagName === 'script' && prev?.type === 'lightbox' && /lightbox/.test(outer(n))) continue;

    if (hasMarker(n)) {
      blocks.push({
        type: 'container',
        tag: n.tagName,
        attrs: Object.fromEntries(n.attrs.map((a) => [a.name, a.value])),
        children: convertNodes(n.childNodes as Node[], path, report, verify),
      });
      continue;
    }
    const key = keyOf(n);
    const parser = PARSERS[key];
    if (!parser) {
      blocks.push({ type: 'html', html: outer(n) });
      report.fallback[key] = (report.fallback[key] ?? 0) + 1;
      continue;
    }
    try {
      const block = parser(n);
      if (verify) {
        const original = canonHtml(outer(n), { stripEnhancements: true });
        const rendered = canonHtml(renderBlockToHtml(block, { path }), { stripEnhancements: true });
        const diff = firstDifference(original, rendered, 60);
        if (diff) throw new Mismatch(`рендер расходится @${diff.at}: «${diff.a}» ≠ «${diff.b}»`);
      }
      blocks.push(block);
      report.typed[key] = (report.typed[key] ?? 0) + 1;
    } catch (err) {
      if (!(err instanceof Mismatch)) throw err;
      blocks.push({ type: 'html', html: outer(n) });
      note(report, key, `${path}: ${err.message}`);
    }
  }
  return blocks;
}

export function htmlToBlocks(rawBody: string, path: string, report = newReport(), verify = true): Block[] {
  const body = stripHtmlComments(rawBody, { keepBlockMarkers: true });
  const frag = parseFragment(body);
  return convertNodes(frag.childNodes as Node[], path, report, verify);
}

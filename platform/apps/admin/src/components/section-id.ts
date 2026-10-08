import type { BlockData } from './BlockList';

/**
 * Метка HTML-секции для её своего CSS и скрипта (атрибут data-s у корня,
 * content-kit/section): 8 знаков латиницы и цифр.
 */
export function newSectionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

/** Копия блока: у HTML-секций (и внутри контейнеров) — новая метка, чтобы скрипт копии нашёл свою секцию. */
export function cloneBlock(block: BlockData): BlockData {
  const copy = structuredClone(block);
  const renew = (b: BlockData) => {
    if (b.type === 'html' && b.sid) b.sid = newSectionId();
    if (b.type === 'container') (b.children as BlockData[]).forEach(renew);
  };
  renew(copy);
  return copy;
}

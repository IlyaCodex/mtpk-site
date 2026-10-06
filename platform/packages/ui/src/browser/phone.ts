/**
 * Маска телефона (перенос phone-mask.js): +7 (___) ___-__-__ для РФ и
 * Казахстана; если введён код другой страны (+998, +375, +1…) — свободный ввод.
 */

/** Номер РФ/КЗ из цифр абонентского номера (без кода 7), максимум 10. */
export function formatRu(d: string): string {
  d = d.slice(0, 10);
  let out = '+7';
  if (d.length === 0) return out;
  out += ` (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/** Новое значение поля после ввода; null — оставить как есть. */
export function maskPhone(v: string): string | null {
  if (/^\s*\+\s*(?!7)\d/.test(v)) {
    const cleaned = v.replace(/[^\d+()\-\s]/g, '');
    return cleaned !== v ? cleaned : null;
  }
  const t = v.trim();
  if (t === '' || t === '+') return null;
  let digits = v.replace(/\D/g, '');
  if (digits.charAt(0) === '8') digits = `7${digits.slice(1)}`;
  if (digits.charAt(0) === '7') digits = digits.slice(1);
  return formatRu(digits);
}

/** Обработчик onInput для <input type="tel">. */
export function onPhoneInput(e: { currentTarget: HTMLInputElement }) {
  const el = e.currentTarget;
  const next = maskPhone(el.value);
  if (next === null || next === el.value) return;
  el.value = next;
  const end = el.value.length;
  try {
    el.setSelectionRange(end, end);
  } catch {
    /* поле без выделения */
  }
}

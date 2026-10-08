import { parseFragment, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { toProps } from '../primitives/attrs.ts';
import { RawElement } from '../primitives/Html.tsx';
import { CatalogOfferForm } from './CatalogOfferForm.tsx';
import { EXPRESS_CONSENT, ExpressForm } from './ExpressForm.tsx';
import { QuickCallForm } from './QuickCallForm.tsx';
import { RequestForm } from './RequestForm.tsx';
import { ShortForm } from './ShortForm.tsx';
import { SpareRequestForm } from './SpareRequestForm.tsx';

/**
 * Тег-заготовка формы в HTML-секции: <ui-form type="…" name="…" …></ui-form>.
 * На его месте при выводе страницы — компонент формы из этой папки, поэтому
 * вёрстка и отправка всех форм одинаковы, а в секции задаются только тексты.
 *
 * type      — вид формы (FORM_TYPES); name — источник заявки в CRM;
 * остальные атрибуты — тексты и настройки вида (см. FormSlot).
 */
export const FORM_TAG = 'ui-form';

/** Виды форм: значение type → название для людей. */
export const FORM_TYPES = {
  request: 'Подбор и расчёт — имя, почта, телефон, задача',
  short: 'Лучшее предложение — телефон и файл',
  express: 'Экспресс-заявка — телефон (и имя)',
  call: 'Звонок — телефон (как в шапке)',
  catalog: 'Предложение по каталогу — телефон, файл, кнопка в строку',
  spare: 'Запрос запчасти — деталь, модель, количество',
} as const;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Форма по атрибутам тега <ui-form>. Неизвестный вид — ничего (страница не падает). */
export function FormSlot({ attrs }: { attrs: Record<string, string> }): ReactElement | null {
  const get = (k: string) => (attrs[k] !== undefined && attrs[k] !== '' ? attrs[k] : undefined);
  const flag = (k: string) => k in attrs && !['false', 'no', 'нет', '0'].includes(attrs[k].trim().toLowerCase());
  switch (attrs.type) {
    case 'request':
      return (
        <RequestForm
          formName={get('name') ?? 'Подбор и расчёт'}
          title={get('title') ?? 'Запрос подбора и расчёта'}
          idPrefix={get('ids') ?? 'rf'}
          marks={flag('marks')}
          taskLabel={get('task-label')}
          taskPlaceholder={get('task-placeholder') ?? ''}
          file={flag('file')}
          submit={get('submit') ?? 'Отправить заявку'}
        />
      );
    case 'short': {
      const fileLabel = get('file');
      return (
        <ShortForm
          formName={get('name') ?? 'Лучшее предложение'}
          submit={get('submit') ?? 'Получить лучшее предложение'}
          phoneId={get('phone-id')}
          phoneAutocomplete={get('phone-autocomplete') === 'off' ? 'off' : 'tel'}
          file={fileLabel && !['нет', 'no', 'false'].includes(fileLabel) ? { label: fileLabel, id: get('file-id') ?? 'bo-file', inputClassName: get('file-class') } : null}
          hiddenName={get('hidden-name')}
        />
      );
    }
    case 'express': {
      const link = get('consent-link');
      return (
        <ExpressForm
          formName={get('name') ?? 'Экспресс-заявка'}
          buttonLabel={get('button')}
          consent={link ? `Согласен с&nbsp;<a href="/policy/" target="_blank" rel="noopener">${escapeHtml(link)}</a>` : EXPRESS_CONSENT}
          phoneLabel={get('phone-label')}
          contact={
            get('ids')
              ? { suffix: get('ids')!, nameLabel: escapeHtml(get('name-label') ?? 'Как к вам обращаться'), phoneLabel: escapeHtml(get('phone-label') ?? 'Телефон') }
              : undefined
          }
        />
      );
    }
    case 'call':
      return <QuickCallForm />;
    case 'catalog':
      return <CatalogOfferForm formName={get('name')} />;
    case 'spare':
      return (
        <SpareRequestForm
          formName={get('name') ?? 'Запчасти'}
          modelLabel={get('model-label') ?? 'Модель установки'}
          modelPlaceholder={get('model-placeholder') ?? ''}
        />
      );
    default:
      return null;
  }
}

type Node = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
const isElement = (n: Node): n is Element => 'tagName' in n;
const attrsOf = (el: Element) => Object.fromEntries(el.attrs.map((a) => [a.name, a.value]));
const hasForm = (el: Element): boolean => el.childNodes.some((c) => isElement(c) && (c.tagName === FORM_TAG || hasForm(c)));

function renderNode(n: Node, key: number): ReactNode {
  if (n.nodeName === '#text') return (n as DefaultTreeAdapterMap['textNode']).value;
  if (!isElement(n)) return null;
  if (n.tagName === FORM_TAG) return <FormSlot key={key} attrs={attrsOf(n)} />;
  // ветки без форм — как есть; элементы на пути к форме — React-элементы
  if (!hasForm(n)) return <RawElement key={key} html={serializeOuter(n)} />;
  return createElement(n.tagName, { ...toProps(attrsOf(n), n.tagName), key }, ...n.childNodes.map(renderNode));
}

/** Есть ли в HTML формы-заготовки. */
export const hasFormSlots = (html: string) => html.includes(`<${FORM_TAG}`);

/** HTML-секция с тегами <ui-form>: формы — компоненты, остальная разметка — как есть. */
export function HtmlWithForms({ html }: { html: string }) {
  return <>{parseFragment(html).childNodes.map(renderNode)}</>;
}

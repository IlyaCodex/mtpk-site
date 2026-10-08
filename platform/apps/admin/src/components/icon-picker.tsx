'use client';

import { useEffect, useMemo, useState } from 'react';
import { withBase } from '@/lib/base-path';
import { CodeEditor } from './CodeEditor';
import { Icon } from './icons';
import { Modal } from './media';
import { ICON_COLORS, isMulticolor, normalizeSvg, replaceSvg, safeSvg, svgColor, svgFromBody, toHex, withSvgColor } from './svg-icon';
import { Button, cx } from './ui';

/**
 * Иконка в содержимом страницы: окно «Иконка и цвет» (библиотека, свой SVG,
 * цвет) и поле формы с ним. Библиотека — контурные иконки Solar
 * (public/icons/solar-linear.json, собирает scripts/icons-solar.ts),
 * грузится при первом открытии окна.
 */

let library: Promise<Record<string, string>> | null = null;
function loadLibrary(): Promise<Record<string, string>> {
  library ??= fetch(withBase('/icons/solar-linear.json'))
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Record<string, string>>;
    })
    .catch((e: unknown) => {
      library = null;
      throw e;
    });
  return library;
}

/** Для сайта завода — в первую очередь. */
const SUGGESTED = [
  'delivery', 'box', 'shield-check', 'shield-star', 'medal-ribbon-star', 'verified-check', 'diploma-verified', 'cup-star',
  'settings', 'tuning-2', 'sledgehammer', 'toolbox', 'ruler', 'ruler-angular', 'scale', 'temperature', 'thermometer',
  'fire', 'flame', 'bolt', 'lightning', 'power', 'cpu-bolt', 'magnet', 'magnet-wave', 'waterdrop', 'snowflake', 'wind',
  'speedometer-max', 'hourglass', 'clock-circle', 'stopwatch', 'calendar', 'history', 'map-point', 'globe', 'route',
  'city', 'buildings', 'buildings-2', 'garage', 'document', 'document-text', 'documents', 'clipboard-check', 'checklist',
  'file-check', 'chart', 'graph-up', 'diagram-up', 'pie-chart', 'ruble', 'wallet', 'hand-money', 'tag-price', 'cart-large',
  'phone', 'phone-calling', 'chat-round-dots', 'letter', 'user', 'users-group-rounded', 'user-check', 'hand-shake', 'like',
  'star', 'rocket', 'lightbulb-bolt', 'check-circle', 'danger-triangle', 'info-circle', 'question-circle', 'layers',
  'widget', 'server', 'monitor', 'atom', 'test-tube', 'eye', 'magnifier', 'download', 'play-circle', 'camera', 'gallery',
];

/** Поиск по-русски: начало слова → части английских названий иконок. */
const RU: [stem: string, names: string[]][] = [
  ['достав', ['delivery', 'box', 'route', 'plane', 'bus']],
  ['груз', ['delivery', 'box', 'scale']],
  ['отгруз', ['delivery', 'box']],
  ['логист', ['delivery', 'route', 'routing']],
  ['машин', ['delivery', 'car', 'bus', 'settings']],
  ['коробк', ['box', 'archive']],
  ['упаков', ['box', 'archive']],
  ['склад', ['box', 'archive', 'garage', 'buildings']],
  ['гарант', ['shield', 'medal', 'verified']],
  ['защит', ['shield', 'lock']],
  ['безопас', ['shield', 'lock']],
  ['качеств', ['medal', 'verified', 'star', 'cup']],
  ['наград', ['medal', 'cup', 'crown']],
  ['сертиф', ['diploma', 'medal', 'verified', 'document']],
  ['надёж', ['shield', 'verified']],
  ['надеж', ['shield', 'verified']],
  ['настро', ['settings', 'tuning']],
  ['налад', ['settings', 'tuning', 'toolbox']],
  ['сервис', ['settings', 'toolbox', 'sledgehammer', 'tuning']],
  ['ремонт', ['sledgehammer', 'toolbox', 'settings']],
  ['инструм', ['sledgehammer', 'toolbox', 'ruler']],
  ['монтаж', ['sledgehammer', 'toolbox', 'settings']],
  ['запчаст', ['settings', 'box', 'toolbox']],
  ['размер', ['ruler', 'scale', 'maximize']],
  ['измер', ['ruler', 'scale', 'speedometer']],
  ['вес', ['scale']],
  ['масс', ['scale']],
  ['температ', ['temperature', 'thermometer', 'fire']],
  ['нагрев', ['temperature', 'fire', 'flame']],
  ['огон', ['fire', 'flame', 'bonfire']],
  ['огн', ['fire', 'flame', 'bonfire']],
  ['плав', ['fire', 'flame', 'temperature']],
  ['печ', ['fire', 'flame', 'temperature']],
  ['энерг', ['bolt', 'lightning', 'power', 'battery']],
  ['мощн', ['bolt', 'lightning', 'power', 'speedometer']],
  ['электр', ['bolt', 'lightning', 'plug', 'socket']],
  ['ток', ['bolt', 'lightning', 'plug']],
  ['индук', ['magnet', 'bolt', 'lightning']],
  ['магнит', ['magnet']],
  ['вод', ['water', 'waterdrop']],
  ['охлажд', ['snowflake', 'waterdrop', 'wind', 'temperature']],
  ['воздух', ['wind']],
  ['скорост', ['speedometer', 'rocket', 'bolt']],
  ['быстр', ['rocket', 'bolt', 'stopwatch', 'speedometer']],
  ['время', ['clock', 'hourglass', 'stopwatch', 'history']],
  ['врем', ['clock', 'hourglass', 'stopwatch', 'history']],
  ['срок', ['hourglass', 'clock', 'calendar']],
  ['час', ['clock', 'stopwatch']],
  ['календ', ['calendar']],
  ['дат', ['calendar']],
  ['опыт', ['history', 'medal', 'cup']],
  ['лет', ['calendar', 'history']],
  ['мест', ['map-point', 'map']],
  ['адрес', ['map-point', 'map', 'streets']],
  ['карт', ['map', 'map-point', 'card']],
  ['город', ['city', 'buildings', 'map-point']],
  ['регион', ['map', 'globe', 'map-point']],
  ['стран', ['globe', 'earth', 'map']],
  ['мир', ['globe', 'earth']],
  ['географ', ['globe', 'map', 'earth']],
  ['завод', ['buildings', 'city', 'garage', 'settings']],
  ['производ', ['buildings', 'settings', 'garage', 'tuning']],
  ['цех', ['buildings', 'garage', 'settings']],
  ['здан', ['buildings', 'home', 'city']],
  ['офис', ['buildings', 'case']],
  ['дом', ['home', 'house']],
  ['документ', ['document', 'file', 'clipboard', 'documents']],
  ['договор', ['document', 'file-pen', 'pen']],
  ['паспорт', ['passport', 'document']],
  ['чертёж', ['ruler', 'document', 'pen']],
  ['чертеж', ['ruler', 'document', 'pen']],
  ['проект', ['ruler-cross-pen', 'document', 'clipboard', 'layers']],
  ['список', ['checklist', 'list']],
  ['провер', ['checklist', 'clipboard-check', 'check', 'magnifier']],
  ['галоч', ['check']],
  ['готов', ['check', 'verified']],
  ['график', ['chart', 'graph', 'diagram']],
  ['рост', ['graph-up', 'diagram-up', 'chart']],
  ['статист', ['chart', 'pie-chart', 'graph']],
  ['деньг', ['ruble', 'wallet', 'money', 'banknote', 'hand-money']],
  ['цен', ['tag-price', 'ruble', 'wallet']],
  ['стоим', ['ruble', 'tag-price', 'wallet']],
  ['руб', ['ruble']],
  ['оплат', ['card', 'wallet', 'ruble']],
  ['скидк', ['sale', 'tag-price']],
  ['лизинг', ['hand-money', 'ruble', 'document']],
  ['покуп', ['cart', 'bag', 'shop']],
  ['корзин', ['cart']],
  ['магазин', ['shop', 'cart']],
  ['телефон', ['phone', 'call']],
  ['звон', ['phone', 'call']],
  ['связ', ['phone', 'chat', 'letter']],
  ['чат', ['chat', 'dialog']],
  ['сообщ', ['chat', 'letter', 'dialog']],
  ['консульт', ['chat', 'user-speak', 'phone', 'question']],
  ['почт', ['letter', 'mailbox', 'inbox']],
  ['письм', ['letter']],
  ['челов', ['user', 'men']],
  ['клиент', ['user', 'users-group', 'hand-shake']],
  ['команд', ['users-group', 'user-hands']],
  ['люд', ['users-group', 'user']],
  ['специал', ['user-check', 'user-id', 'user']],
  ['инженер', ['user-check', 'ruler', 'settings']],
  ['партн', ['hand-shake', 'users-group']],
  ['рукопож', ['hand-shake']],
  ['нрав', ['like', 'heart']],
  ['звезд', ['star']],
  ['рейтинг', ['star', 'ranking']],
  ['иде', ['lightbulb']],
  ['лампоч', ['lightbulb']],
  ['ракет', ['rocket']],
  ['внимани', ['danger', 'siren', 'info']],
  ['предупр', ['danger', 'shield-warning']],
  ['информ', ['info', 'document']],
  ['вопрос', ['question']],
  ['компьют', ['monitor', 'laptop', 'cpu']],
  ['сервер', ['server']],
  ['процессор', ['cpu']],
  ['автомат', ['cpu', 'settings', 'programming']],
  ['управлен', ['tuning', 'settings', 'cpu', 'remote']],
  ['слой', ['layers']],
  ['слои', ['layers']],
  ['стрелк', ['arrow']],
  ['скача', ['download']],
  ['загруз', ['upload', 'download']],
  ['поиск', ['magnifier']],
  ['замок', ['lock']],
  ['ключ', ['key']],
  ['глаз', ['eye']],
  ['видео', ['video', 'play', 'videocamera']],
  ['фото', ['camera', 'gallery']],
  ['картин', ['gallery']],
  ['сердц', ['heart']],
  ['лаборат', ['test-tube', 'atom']],
  ['хими', ['test-tube', 'atom', 'benzene']],
  ['наук', ['atom', 'test-tube']],
];

/** В названии иконки есть часть part целиком: plane — в plane-2, но не в planet. */
const hasPart = (name: string, part: string) => `-${name}-`.includes(`-${part}-`);

/** Названия иконок по запросу (по-русски или по-английски, слова через пробел — все). */
function search(names: string[], query: string): string[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return names;
  return names.filter((name) =>
    words.every((w) => {
      if (!/[а-яё]/.test(w)) return name.includes(w);
      return RU.some(([stem, parts]) => (w.startsWith(stem) || (w.length >= 3 && stem.startsWith(w))) && parts.some((p) => hasPart(name, p)));
    }),
  );
}

/** Цвет «как в дизайне» в окне — фирменный бирюзовый: так иконки выглядят на сайте чаще всего. */
const DESIGN = '#1f5e78';

/** Иконка в рамке: как на сайте — на светлом и на тёмном фоне. */
function Tile({ svg, dark, size = 'lg' }: { svg: string; dark?: boolean; size?: 'lg' | 'sm' }) {
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-lg border',
        dark ? 'border-slate-700 bg-[#101f26]' : 'border-slate-200 bg-[#f0f5f8]',
        size === 'lg' ? 'h-24 w-24 [&>svg]:h-12 [&>svg]:w-12' : 'h-12 w-12 [&>svg]:h-7 [&>svg]:w-7',
      )}
      style={{ color: dark ? '#6cbb54' : DESIGN }}
      dangerouslySetInnerHTML={{ __html: safeSvg(svg) }}
    />
  );
}

/** Цвет: «как в дизайне», цвета дизайн-системы, свой (поле выбора цвета и #код). */
export function ColorChooser({
  value,
  onChange,
  designHint = 'Цвет задаёт оформление сайта (обычно фирменный бирюзовый)',
}: {
  value: string | null;
  onChange: (color: string | null) => void;
  /** подсказка у «Как в дизайне» */
  designHint?: string;
}) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const preset = ICON_COLORS.some(([c]) => c === value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cx('h-8 rounded-full border px-3 text-xs', value === null ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}
        title={designHint}
      >
        Как в дизайне
      </button>
      {ICON_COLORS.map(([c, label]) => (
        <button
          key={c}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cx('h-7 w-7 rounded-full border border-slate-300', value === c && 'ring-2 ring-brand-500 ring-offset-2')}
          style={{ background: c }}
        />
      ))}
      <label
        className={cx('relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-xs text-slate-600 hover:bg-slate-50', value && !preset ? 'border-brand-500' : 'border-slate-300')}
        title="Свой цвет"
      >
        <span className="h-5 w-5 rounded-full border border-slate-300" style={{ background: value && !preset ? value : 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }} />
        Свой
        <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={value ?? DESIGN} onChange={(e) => onChange(e.target.value)} />
      </label>
      <input
        className="field h-8 w-24 font-mono text-xs"
        value={draft}
        placeholder="#1f5e78"
        aria-label="Код цвета"
        onChange={(e) => {
          const v = e.target.value.trim();
          setDraft(e.target.value);
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => {
          const hex = draft.trim() ? toHex(draft) : null;
          if (hex) onChange(hex);
          else setDraft(value ?? '');
        }}
      />
    </div>
  );
}

/**
 * Окно «Иконка и цвет»: иконка из библиотеки или свой SVG и её цвет.
 * onChoose получает готовый <svg> (размер и класс — от прежней иконки).
 */
export function IconPicker({ value, onChoose, onRemove, onClose }: { value: string; onChoose: (svg: string) => void; onRemove?: () => void; onClose: () => void }) {
  const [lib, setLib] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'library' | 'custom'>('library');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(160);
  const [picked, setPicked] = useState<{ svg: string; name: string | null } | null>(null);
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState('');
  const [color, setColor] = useState<string | null>(() => svgColor(value));

  useEffect(() => {
    loadLibrary().then(setLib, () => setFailed(true));
  }, []);

  const names = useMemo(() => {
    if (!lib) return [];
    const all = Object.keys(lib);
    if (query.trim()) return search(all, query);
    const first = SUGGESTED.filter((n) => lib[n]);
    return [...first, ...all.filter((n) => !first.includes(n))];
  }, [lib, query]);

  const result = picked ? replaceSvg(value, picked.svg, color) : value ? withSvgColor(value, color) : '';
  const multicolor = result ? isMulticolor(result) : false;

  const takeCustom = (code: string) => {
    setCustom(code);
    if (!code.trim()) return setCustomError('');
    const svg = normalizeSvg(code);
    if (!svg) return setCustomError('Это не SVG: нужен код, который начинается с <svg');
    setCustomError('');
    setPicked({ svg, name: null });
  };

  return (
    <Modal title="Иконка и цвет" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex gap-2">
            {result ? (
              <>
                <Tile svg={result} />
                <Tile svg={result} dark />
              </>
            ) : (
              <span className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">Иконка не выбрана</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-xs font-medium text-slate-600">Цвет иконки</div>
            <ColorChooser value={color} onChange={setColor} />
            <p className="text-xs text-slate-500">
              «Как в дизайне» — цвет из оформления сайта (на светлом фоне обычно бирюзовый, на тёмном — зелёный, как в рамках слева). Выбранный цвет одинаков на любом фоне.
            </p>
            {multicolor && <p className="text-xs text-amber-700">Иконка многоцветная: цвет меняет только те её части, что нарисованы «цветом текста».</p>}
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {(
            [
              ['library', 'Библиотека'],
              ['custom', 'Свой SVG'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cx('-mb-px border-b-2 px-3 py-2 text-sm', tab === t ? 'border-brand-600 font-medium text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'library' ? (
          <div className="space-y-3">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                className="field pl-9"
                autoFocus
                placeholder="Поиск: доставка, гарантия, нагрев, срок, телефон… или по-английски: delivery, shield"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(160);
                }}
              />
            </div>
            {failed ? (
              <p className="text-sm text-red-600">Библиотека иконок не загрузилась — обновите страницу или вставьте свой SVG.</p>
            ) : !lib ? (
              <p className="text-sm text-slate-400">Загружаем иконки…</p>
            ) : !names.length ? (
              <p className="text-sm text-slate-500">Ничего не нашлось — попробуйте другое слово или вкладку «Свой SVG».</p>
            ) : (
              <>
                <div className="text-xs text-slate-500">
                  {query.trim() ? `Найдено: ${names.length}` : `Сначала — подходящие для сайта, дальше все ${names.length}`}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
                  {names.slice(0, limit).map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      onClick={() => setPicked({ svg: svgFromBody(lib[name]), name })}
                      className={cx(
                        'flex h-13 items-center justify-center rounded-lg border text-slate-700 [&>span>svg]:h-6 [&>span>svg]:w-6',
                        picked?.name === name ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <span dangerouslySetInnerHTML={{ __html: svgFromBody(lib[name]) }} />
                    </button>
                  ))}
                </div>
                {names.length > limit && (
                  <Button size="sm" onClick={() => setLimit((l) => l + 320)}>
                    Показать ещё ({names.length - limit})
                  </Button>
                )}
                <p className="text-[11px] text-slate-400">Иконки Solar (480 Design, CC BY 4.0) — тот же набор, что в коллекциях Solar на svgrepo.com.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Вставьте код SVG — например, со{' '}
              <a href="https://www.svgrepo.com/" target="_blank" rel="noreferrer" className="text-brand-700 underline">
                svgrepo.com
              </a>{' '}
              (страница иконки → «Copy SVG») — или выберите файл .svg. Размеры, служебные теги и скрипты уберутся сами; иконку одного цвета можно будет перекрашивать.
            </p>
            <CodeEditor value={custom} onChange={takeCustom} lang="html" />
            <div className="flex items-center gap-3">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Выбрать файл .svg
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) takeCustom(await file.text());
                    e.target.value = '';
                  }}
                />
              </label>
              {customError && <span className="text-xs text-red-600">{customError}</span>}
              {!customError && picked && !picked.name && <span className="text-xs text-accent-700">Иконка готова — вверху видно, как она будет выглядеть</span>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            {onRemove && value && (
              <Button variant="danger" size="sm" onClick={onRemove}>
                <Icon name="trash" className="h-4 w-4" />
                Убрать иконку
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Отмена</Button>
            <Button variant="primary" disabled={!result || result === value} onClick={() => onChoose(result)}>
              Применить
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Поле «Иконка (SVG)»: иконка, кнопка окна «Иконка и цвет», быстрый цвет и код. */
export function IconField({ value, onChange, removable }: { value: string; onChange: (svg: string) => void; removable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(false);
  const color = value ? svgColor(value) : null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} title="Сменить иконку и цвет" className="rounded-lg hover:ring-2 hover:ring-brand-300">
          {value ? <Tile svg={value} size="sm" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400"><Icon name="add" className="h-5 w-5" /></span>}
        </button>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Icon name="palette" className="h-4 w-4" />
          {value ? 'Иконка и цвет…' : 'Выбрать иконку…'}
        </Button>
        {value && (
          <label className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50" title="Цвет иконки">
            <span className="h-4 w-4 rounded-full border border-slate-300" style={{ background: color ?? DESIGN }} />
            {color ?? 'как в дизайне'}
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={color ?? DESIGN} onChange={(e) => onChange(withSvgColor(value, e.target.value))} />
          </label>
        )}
        {value && color && (
          <button type="button" className="text-xs text-slate-500 underline hover:text-slate-800" onClick={() => onChange(withSvgColor(value, null))}>
            сбросить цвет
          </button>
        )}
        <button type="button" className="ml-auto text-xs text-slate-500 hover:text-slate-800" onClick={() => setCode(!code)}>
          {code ? 'Скрыть код' : 'Код SVG'}
        </button>
      </div>
      {code && (
        <div className="mt-2">
          <CodeEditor value={value} onChange={onChange} lang="html" />
        </div>
      )}
      {open && (
        <IconPicker
          value={value}
          onClose={() => setOpen(false)}
          onChoose={(svg) => {
            onChange(svg);
            setOpen(false);
          }}
          onRemove={
            removable
              ? () => {
                  onChange('');
                  setOpen(false);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// Блок «Преимущества» (маркеры adv, adv-12, adv-chiller) — общая секция сайта: под товарами (общие блоки
// категорий) и на /spasibo/. Слева — зелёная карточка «Расширенная гарантия» с крупным сроком, справа —
// четыре карточки с иконками (набор Solar).
// warranty — срок гарантии: «18 месяцев» по умолчанию, «12 месяцев» — у чиллеров и транзисторных печей
// (поле товара в каталоге).

/** Иконки Solar (линии 1.5) — содержимое <svg viewBox="0 0 24 24">. */
const ICONS = {
  shield: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M3 10.42C3 7.22 3 5.62 3.38 5.08C3.76 4.54 5.26 4.03 8.26 3L8.84 2.8C10.41 2.27 11.19 2 12 2C12.81 2 13.6 2.27 15.16 2.8L15.74 3C18.74 4.03 20.25 4.54 20.62 5.08C21 5.62 21 7.22 21 10.42C21 10.9 21 11.42 21 11.99C21 17.63 16.76 20.37 14.1 21.53C13.38 21.84 13.02 22 12 22C10.98 22 10.62 21.84 9.9 21.53C7.24 20.37 3 17.63 3 11.99C3 11.42 3 10.9 3 10.42Z"/><path stroke-linejoin="round" d="M9.5 12.4L10.93 14L14.5 10"/></g>',
  quality: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M16 4C18.18 4.01 19.35 4.11 20.12 4.88C21 5.76 21 7.17 21 10V16C21 18.83 21 20.24 20.12 21.12C19.24 22 17.83 22 15 22H9C6.17 22 4.76 22 3.88 21.12C3 20.24 3 18.83 3 16V10C3 7.17 3 5.76 3.88 4.88C4.65 4.11 5.82 4.01 8 4"/><path stroke-linejoin="round" d="M9 13.4L10.71 15L15 11"/><path d="M8 3.5C8 2.67 8.67 2 9.5 2H14.5C15.33 2 16 2.67 16 3.5V4.5C16 5.33 15.33 6 14.5 6H9.5C8.67 6 8 5.33 8 4.5V3.5Z"/></g>',
  task: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="2" transform="rotate(-90 12 12)"/><circle cx="10" cy="20" r="2" transform="rotate(-90 10 20)"/><circle cx="2" cy="2" r="2" transform="matrix(0 -1 -1 0 16 6)"/><path d="M16 12L19 12"/><path d="M14 20L19 20"/><path d="M10 4L5 4"/><path d="M5 12L8 12"/><path d="M5 20L6 20"/><path d="M19 4L18 4"/></g>',
  service: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M13.77 2.15C13.4 2 12.93 2 12 2C11.07 2 10.6 2 10.23 2.15C9.74 2.36 9.36 2.74 9.15 3.23C9.06 3.46 9.02 3.72 9.01 4.1C8.99 4.66 8.7 5.17 8.22 5.45C7.74 5.73 7.15 5.72 6.65 5.46C6.32 5.28 6.07 5.18 5.83 5.15C5.31 5.08 4.78 5.22 4.35 5.55C4.04 5.79 3.81 6.19 3.34 7C2.87 7.81 2.64 8.21 2.59 8.6C2.52 9.13 2.66 9.66 2.99 10.08C3.13 10.28 3.34 10.44 3.66 10.64C4.13 10.94 4.44 11.44 4.44 12C4.44 12.56 4.13 13.06 3.66 13.36C3.34 13.56 3.13 13.72 2.99 13.92C2.66 14.34 2.52 14.87 2.59 15.4C2.64 15.79 2.87 16.19 3.34 17C3.81 17.81 4.04 18.21 4.35 18.45C4.78 18.78 5.31 18.92 5.83 18.85C6.07 18.82 6.32 18.72 6.65 18.54C7.15 18.28 7.74 18.27 8.22 18.55C8.7 18.83 8.99 19.34 9.01 19.9C9.02 20.28 9.06 20.54 9.15 20.77C9.36 21.26 9.74 21.64 10.23 21.85C10.6 22 11.07 22 12 22C12.93 22 13.4 22 13.77 21.85C14.26 21.64 14.64 21.26 14.85 20.77C14.94 20.54 14.98 20.28 14.99 19.9C15.01 19.34 15.3 18.83 15.78 18.55C16.26 18.27 16.85 18.28 17.35 18.54C17.68 18.72 17.93 18.82 18.17 18.85C18.69 18.92 19.22 18.78 19.65 18.45C19.96 18.21 20.19 17.81 20.66 17C21.13 16.19 21.36 15.79 21.41 15.4C21.48 14.87 21.34 14.34 21.01 13.92C20.87 13.72 20.66 13.56 20.34 13.36C19.87 13.06 19.56 12.56 19.56 12C19.56 11.44 19.87 10.94 20.34 10.64C20.66 10.44 20.87 10.28 21.01 10.08C21.34 9.66 21.48 9.13 21.41 8.6C21.36 8.21 21.13 7.81 20.66 7C20.19 6.19 19.96 5.79 19.65 5.55C19.22 5.22 18.69 5.08 18.17 5.15C17.93 5.18 17.68 5.28 17.35 5.46C16.85 5.72 16.26 5.73 15.78 5.45C15.3 5.17 15.01 4.66 14.99 4.1C14.98 3.72 14.94 3.46 14.85 3.23C14.64 2.74 14.26 2.36 13.77 2.15Z"/></g>',
  base: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M22 22L2 22"/><path d="M3 22V11.35C3 10.49 3.37 9.67 4.01 9.11L10.01 3.77C11.14 2.76 12.86 2.76 13.99 3.77L19.99 9.11C20.63 9.67 21 10.49 21 11.35V22"/><path d="M10 9H14"/><path d="M9 15.5H15"/><path d="M9 18.5H15"/><path d="M18 22V16C18 14.11 18 13.17 17.41 12.59C16.83 12 15.89 12 14 12H10C8.11 12 7.17 12 6.59 12.59C6 13.17 6 14.11 6 16V22"/></g>',
};

type IconName = keyof typeof ICONS;

const Icon = ({ name, className }: { name: IconName; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
);

const ITEMS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'quality', title: 'Контроль качества', text: 'Проверяем комплектующие, сборку и\u00A0узлы перед отгрузкой оборудования.' },
  { icon: 'task', title: 'Под\u00A0вашу задачу', text: 'Адаптируем оборудование под\u00A0участок, режим работы, металл и\u00A0производительность.' },
  { icon: 'service', title: 'Сервисное сопровождение', text: 'Диагностика, подбор запасных частей и\u00A0выполнение ремонтных работ.' },
  { icon: 'base', title: 'Собственная база', text: 'Производство, склад и\u00A0сервис для\u00A0поддержки вашего оборудования.' },
];

/** «18 месяцев» → число и слово под ним; срок без числа в начале — целиком вместо числа. */
function splitWarranty(warranty: string): { value: string; unit: string | null } {
  const m = /^\s*(\d+(?:[.,]\d+)?)[\s\u00A0]+(.+?)\s*$/.exec(warranty);
  return m ? { value: m[1]!, unit: m[2]! } : { value: warranty.trim(), unit: null };
}

export function Adv({ warranty = '18\u00A0месяцев' }: { warranty?: string }) {
  const term = splitWarranty(warranty);
  return (
    <section className="benefits" aria-label="Преимущества собственного производства">
      <div className="container">
        <div className="benefits__head">
          <div className="benefits__eyebrow">Преимущества</div>
          <h2 className="benefits__title">
            Собственное производство. <em>Контроль на&nbsp;каждом этапе.</em>
          </h2>
          <p className="benefits__lead">
            {'Подбираем комплектующие, собираем и\u00A0проверяем оборудование. Адаптируем решения под\u00A0задачу вашего производства.'}
          </p>
        </div>
        <div className="benefits__grid">
          <div className="warranty-card">
            <Icon name="shield" className="warranty-card__mark" />
            <Icon name="shield" className="warranty-card__icon" />
            <div className="warranty-card__label">Расширенная гарантия</div>
            <div className={term.unit ? 'warranty-card__value' : 'warranty-card__value warranty-card__value--text'}>{term.value}</div>
            {term.unit && <div className="warranty-card__unit">{term.unit}</div>}
            <div className="warranty-card__foot">
              <span className="warranty-card__bar" aria-hidden="true" />
              на&nbsp;оборудование
            </div>
          </div>
          {ITEMS.map((it) => (
            <div className="benefit" key={it.icon}>
              <Icon name={it.icon} className="benefit__icon" />
              <h3 className="benefit__title">{it.title}</h3>
              <p className="benefit__text">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

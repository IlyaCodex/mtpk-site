/**
 * Страница 404 (перенос 404.astro). Оформление — Tailwind-утилитами вместо
 * отдельного CSS: первый блок сайта, свёрстанный на токенах дизайн-системы.
 */
export default function NotFound() {
  return (
    <main>
      <section className="bg-(--surface-page) py-[clamp(56px,12vw,140px)]">
        <div className="container max-w-[560px]! text-center">
          <div className="font-(family-name:--font-display) text-[clamp(96px,20vw,200px)] leading-none font-extrabold tracking-[-0.04em] text-(--teal-600) opacity-[0.14]">
            404
          </div>
          <h1 className="mt-[clamp(4px,1.5vw,12px)] mb-0 font-(family-name:--font-display) text-[clamp(24px,4.5vw,38px)] leading-[1.1] font-bold text-(--text-primary)">
            Страница не{'\u00A0'}найдена
          </h1>
          <p className="mx-auto mt-3.5 mb-0 max-w-[44ch] text-(length:--fs-lead,18px) leading-normal text-(--text-secondary)">
            Возможно, адрес изменился или{'\u00A0'}страница была перемещена.
          </p>
          <div className="mt-[clamp(24px,4vw,36px)] flex flex-wrap justify-center gap-(--sp-4,16px)">
            <a href="/" className="btn btn--primary">
              На{'\u00A0'}главную <span className="btn__arrow">→</span>
            </a>
            <button type="button" className="btn btn--secondary cursor-pointer" data-search-open="">
              Поиск по{'\u00A0'}сайту
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

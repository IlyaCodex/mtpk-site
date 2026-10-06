import { AnalyticsNoscript } from './Analytics';
import { MANGO_SCRIPT } from '@/lib/site';

/**
 * Битрикс24 — сквозная аналитика / call tracker (портал b1785973). Строго перед
 * </body>: проверка «готовности сайта» в кабинете Битрикс ищет код именно там.
 */
const BITRIX_JS = `(function(w,d,u){
      var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/60000|0);
      var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
    })(window,document,'https://cdn-ru.bitrix24.ru/b1785973/crm/tag/call.tracker.js');`;

/**
 * Скрипты в конце <body>: клиентские модули страницы (ES-модули, выполняются
 * после разбора HTML), старые скрипты блоков «HTML как есть», счётчики.
 */
export function SiteScripts({ modules, legacy }: { modules: string[]; legacy: string[] }) {
  return (
    <>
      {modules.map((src) => (
        <script key={src} type="module" src={src} />
      ))}
      {legacy.map((src) => (
        <script key={src} src={src} defer />
      ))}
      <AnalyticsNoscript />
      <script dangerouslySetInnerHTML={{ __html: BITRIX_JS }} />
      {/* Коллтрекинг Mango Office */}
      <script src={MANGO_SCRIPT} defer />
    </>
  );
}

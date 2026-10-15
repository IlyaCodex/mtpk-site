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
 * Коллтрекинг Mango (загрузчик ~460 КБ) работает только на https://uralinduktor.ru и только для
 * посетителей из Директа: метки yandex/cpc в адресе или сохранённые раньше (cookie
 * ui_marketing_trace, packages/ui/src/browser/marketing.ts). Остальным его не грузим — условие
 * шире проверки внутри загрузчика, точную проверку он делает сам.
 */
const MANGO_GATE = `(function(){
      var h=location.hostname,q=location.search;
      if(location.protocol!=='https:'||!/^(www\\.)?uralinduktor\\.ru$/i.test(h))return;
      if(!/[?&]utm_source=yandex(&|$)/i.test(q)&&document.cookie.indexOf('ui_marketing_trace=')<0)return;
      var s=document.createElement('script');s.src=${JSON.stringify(MANGO_SCRIPT)};s.async=true;document.body.appendChild(s);
    })();`;

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
      {/* Коллтрекинг Mango Office — только посетителям из Директа (MANGO_GATE) */}
      <script dangerouslySetInnerHTML={{ __html: MANGO_GATE }} />
    </>
  );
}

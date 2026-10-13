/**
 * Шаблон письма новой рассылки — фирменная вёрстка для почтовых программ:
 * таблицы и встроенные стили (Outlook, Яндекс, Mail.ru, Gmail), ширина 600 px,
 * кнопки — зелёные, как на сайте. Ссылки на сайт получают UTM-метки и
 * отслеживание при запуске. Отписка ({{unsubscribe_url}}) обязательна.
 */
export const DEFAULT_TEMPLATE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>УралИндуктор</title>
<style>
  @media (max-width: 620px) {
    .wrap { width: 100% !important; }
    .pad { padding-left: 24px !important; padding-right: 24px !important; }
    .col { display: block !important; width: 100% !important; }
    .h1 { font-size: 26px !important; line-height: 32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f1;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">

        <!-- шапка -->
        <tr>
          <td class="pad" style="background:#0a1c25;padding:28px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><a href="{{site_url}}/" style="text-decoration:none;"><img src="{{site_url}}/brand/logo-footer-white.png" width="150" alt="УралИндуктор" style="display:block;border:0;width:150px;height:auto;"></a></td>
                <td align="right" style="font-size:13px;color:#8fcc7b;letter-spacing:0.06em;text-transform:uppercase;font-weight:bold;">Новости и&nbsp;предложения</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- главное -->
        <tr>
          <td class="pad" style="padding:44px 40px 12px;">
            <p style="margin:0 0 12px;font-size:13px;line-height:18px;color:#2f702a;letter-spacing:0.08em;text-transform:uppercase;font-weight:bold;">УралИндуктор · с&nbsp;2013 года</p>
            <h1 class="h1" style="margin:0 0 18px;font-size:32px;line-height:38px;color:#18181b;font-weight:bold;">Здравствуйте, {{name|коллеги}}!</h1>
            <p style="margin:0 0 26px;font-size:16px;line-height:26px;color:#3f4a52;">Рассказываем о&nbsp;новинках и&nbsp;оборудовании, которое можно получить быстро: индукционные печи, дробемётные установки и&nbsp;системы охлаждения собственного производства — с&nbsp;гарантией 18&nbsp;месяцев.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:10px;background:#4fab3a;">
                  <a href="{{site_url}}/products/" style="display:inline-block;padding:15px 30px;font-size:15px;line-height:18px;color:#ffffff;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;border-radius:10px;">Смотреть каталог&nbsp;→</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- направления -->
        <tr>
          <td class="pad" style="padding:32px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="col" width="33%" valign="top" style="padding:0 8px 16px 0;">
                  <p style="margin:0 0 6px;font-size:16px;line-height:22px;color:#18181b;font-weight:bold;">Индукционные печи</p>
                  <p style="margin:0 0 8px;font-size:14px;line-height:21px;color:#5b6770;">Плавка стали, чугуна и&nbsp;цветных металлов от&nbsp;100&nbsp;кг до&nbsp;15&nbsp;т.</p>
                  <a href="{{site_url}}/products/induktsionnye-plavilnye-pechi/" style="font-size:14px;color:#2f702a;font-weight:bold;text-decoration:none;">Подробнее →</a>
                </td>
                <td class="col" width="33%" valign="top" style="padding:0 8px 16px;">
                  <p style="margin:0 0 6px;font-size:16px;line-height:22px;color:#18181b;font-weight:bold;">Дробемётное оборудование</p>
                  <p style="margin:0 0 8px;font-size:14px;line-height:21px;color:#5b6770;">Очистка отливок, проката, труб и&nbsp;металлоконструкций.</p>
                  <a href="{{site_url}}/products/drobemetnoe-oborudovanie/" style="font-size:14px;color:#2f702a;font-weight:bold;text-decoration:none;">Подробнее →</a>
                </td>
                <td class="col" width="33%" valign="top" style="padding:0 0 16px 8px;">
                  <p style="margin:0 0 6px;font-size:16px;line-height:22px;color:#18181b;font-weight:bold;">Со&nbsp;склада в&nbsp;Миассе</p>
                  <p style="margin:0 0 8px;font-size:14px;line-height:21px;color:#5b6770;">Оборудование в&nbsp;наличии — отгрузка от&nbsp;1&nbsp;дня.</p>
                  <a href="{{site_url}}/nalichie/" style="font-size:14px;color:#2f702a;font-weight:bold;text-decoration:none;">Что есть сейчас →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- призыв -->
        <tr>
          <td class="pad" style="padding:16px 40px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f9ee;border-radius:14px;">
              <tr>
                <td style="padding:26px 28px;">
                  <p style="margin:0 0 6px;font-size:18px;line-height:24px;color:#18181b;font-weight:bold;">Нужен расчёт под&nbsp;вашу задачу?</p>
                  <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#3f4a52;">Инженер подберёт оборудование и&nbsp;пришлёт коммерческое предложение в&nbsp;течение рабочего дня.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="border-radius:10px;background:#0a1c25;">
                        <a href="{{site_url}}/kontakty/" style="display:inline-block;padding:13px 24px;font-size:14px;line-height:18px;color:#ffffff;font-weight:bold;text-decoration:none;border-radius:10px;">Получить расчёт&nbsp;→</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- подвал -->
        <tr>
          <td class="pad" style="background:#f6f8f7;padding:28px 40px;border-top:1px solid #e3e8e6;">
            <p style="margin:0 0 8px;font-size:14px;line-height:20px;color:#18181b;font-weight:bold;">8&nbsp;800&nbsp;351-34-01 · +7&nbsp;(351)&nbsp;211-65-97 · <a href="mailto:info@uralinduktor.ru" style="color:#2f702a;text-decoration:none;">info@uralinduktor.ru</a></p>
            <p style="margin:0 0 14px;font-size:12px;line-height:18px;color:#5b6770;">ООО «Миасская Торгово-Промышленная Компания» · Челябинская обл., г.&nbsp;Миасс, ул.&nbsp;Уральских Добровольцев, 1в</p>
            <p style="margin:0;font-size:12px;line-height:18px;color:#8a949b;">Вы получили это письмо, потому что оставляли заявку на&nbsp;сайте uralinduktor.ru или работаете с&nbsp;нашей компанией. <a href="{{unsubscribe_url}}" style="color:#5b6770;text-decoration:underline;">Отписаться от&nbsp;рассылки</a></p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

/** Получатель для предпросмотра письма. */
export const SAMPLE = { name: 'Иван Петров', email: 'ivan@example.com' };

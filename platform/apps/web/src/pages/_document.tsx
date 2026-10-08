import type { CSSProperties } from 'react';
import Document, { Head, Html, Main, NextScript } from 'next/document';
import { buttonDesignHtml } from '@mtpk/content-kit/design';
import type { SiteSettings } from '@mtpk/content-model';
import { SiteHead } from '@/components/SiteHead';
import { SiteScripts } from '@/components/SiteScripts';
import type { DocumentProps } from '@/lib/page-props';

/**
 * Каркас HTML-документа. Страницы отдаются чистым HTML без клиентского
 * React (unstable_runtimeJS: false у страниц): в <head> — SEO и стили
 * в порядке каскада, в конце <body> — маленькие клиентские модули.
 * Данные для <head> страница передаёт пропсами (getStaticProps). Оформление
 * кнопок из настроек сайта — атрибутами и переменными на <html>.
 */
export default class SiteDocument extends Document {
  override render() {
    const props = this.props.__NEXT_DATA__.props?.pageProps as Partial<DocumentProps> | undefined;
    const ready = props?.head !== undefined;
    const design = buttonDesignHtml((props as { settings?: SiteSettings } | undefined)?.settings?.design);
    return (
      <Html lang="ru" {...design.attrs} style={Object.keys(design.vars).length ? (design.vars as CSSProperties) : undefined}>
        <Head>{ready && <SiteHead page={props.head!} home={props.home} modules={props.modules} />}</Head>
        <body>
          <Main />
          <NextScript />
          {ready && <SiteScripts modules={props.modules ?? []} legacy={props.legacy ?? []} />}
        </body>
      </Html>
    );
  }
}

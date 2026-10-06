import NextHead from 'next/head';

/**
 * viewport с initial-scale=1, как на прежнем сайте (у Next по умолчанию —
 * только width=device-width; тег с тем же name заменяет стандартный).
 */
export function Viewport() {
  return (
    <NextHead>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </NextHead>
  );
}

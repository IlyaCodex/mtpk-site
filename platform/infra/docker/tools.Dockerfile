# syntax=docker/dockerfile:1.7
# Служебный образ: миграции БД и импорт контента из Astro-проекта.
#   docker compose run --rm migrate
#   docker compose --profile tools run --rm importer [--only=pages]
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
ENV CI=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/content-kit/package.json packages/content-kit/
COPY packages/content-model/package.json packages/content-model/
COPY packages/ui/package.json packages/ui/
COPY services/content/package.json services/content/
COPY services/media/package.json services/media/
COPY services/search/package.json services/search/
COPY services/leads/package.json services/leads/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY tools/importer/package.json tools/importer/
COPY tools/parity/package.json tools/parity/

FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY tsconfig.base.json tsconfig.json ./
COPY packages packages
COPY services services
COPY tools/importer tools/importer
COPY scripts scripts
RUN node scripts/build-services.mjs migrate importer

# зависимости импортёра покрывают и миграции (drizzle-orm, pg, zod, pino)
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --workspace tools/importer

FROM ${NODE_IMAGE} AS runtime
# git — импортёр берёт даты публикации страниц из истории репозитория
RUN apk add --no-cache git && git config --system --add safe.directory '*'
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/migrations ./packages/db/migrations
COPY --from=build /app/tools/importer/dist ./tools/importer/dist
USER node
CMD ["node", "packages/db/dist/migrate.js"]

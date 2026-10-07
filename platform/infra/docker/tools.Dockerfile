# syntax=docker/dockerfile:1.7
# Служебный образ: миграции базы (Prisma).
#   docker compose run --rm migrate
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
COPY tools/checks/package.json tools/checks/

# Зависимости пакета БД вместе с devDependencies: Prisma CLI (prisma migrate
# deploy) — в них. Движок миграций скачивается здесь же, при сборке: в
# рантайме контейнеру сеть для этого не нужна.
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --workspace packages/db \
 && cd packages/db && npx prisma version

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY packages/db/package.json packages/db/prisma.config.ts ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
USER node
WORKDIR /app/packages/db
CMD ["/app/node_modules/.bin/prisma", "migrate", "deploy"]

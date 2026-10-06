# syntax=docker/dockerfile:1.7
# Образ Node-сервиса платформы (content, media, search, leads + воркер).
# Сборка: docker compose build <сервис>  (WORKSPACE задаётся в docker-compose.yml)
#
# Слои: зависимости (кешируются, пока не меняются package.json) → бандл esbuild →
# только продакшн-зависимости нужного сервиса → тонкий рантайм на node:22-alpine.

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV CI=1 NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NPM_CONFIG_UPDATE_NOTIFIER=false

# --- package.json всех пакетов монорепо (для npm ci с workspaces) ---------------
FROM base AS manifests
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/content-kit/package.json packages/content-kit/
COPY packages/blocks/package.json packages/blocks/
COPY services/content/package.json services/content/
COPY services/media/package.json services/media/
COPY services/search/package.json services/search/
COPY services/leads/package.json services/leads/
COPY apps/web/package.json apps/web/
COPY tools/importer/package.json tools/importer/
COPY tools/parity/package.json tools/parity/
COPY tools/codegen/package.json tools/codegen/

# --- все зависимости + бандлы -------------------------------------------------
FROM manifests AS build
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY packages packages
COPY services services
COPY tools/importer tools/importer
COPY scripts scripts
COPY tsconfig.base.json tsconfig.json ./
RUN node scripts/build-services.mjs

# --- только продакшн-зависимости нужного пакета ----------------------------------
FROM manifests AS prod-deps
ARG WORKSPACE
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --workspace ${WORKSPACE} \
 && mkdir -p ${WORKSPACE}/node_modules

# --- рантайм -------------------------------------------------------------------
FROM base AS runtime
ARG WORKSPACE
ARG ENTRY=dist/index.js
ENV NODE_ENV=production ENTRY=${ENTRY}
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/${WORKSPACE}/node_modules ./${WORKSPACE}/node_modules
COPY --from=build /app/${WORKSPACE}/package.json ./${WORKSPACE}/package.json
COPY --from=build /app/${WORKSPACE}/dist ./${WORKSPACE}/dist
WORKDIR /app/${WORKSPACE}
USER node
CMD ["sh", "-c", "exec node --enable-source-maps \"$ENTRY\""]

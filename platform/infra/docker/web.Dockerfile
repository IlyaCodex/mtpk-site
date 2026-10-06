# syntax=docker/dockerfile:1.7
# Образ сайта (Next.js, output: standalone).
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV CI=1 NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NPM_CONFIG_UPDATE_NOTIFIER=false
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
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY tsconfig.base.json tsconfig.json ./
COPY packages packages
COPY apps/web apps/web
# Сборка не обращается к сервисам: страницы рендерятся по первому запросу (ISR)
RUN npm run build -w @mtpk/web

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# standalone повторяет структуру монорепо: сервер — apps/web/server.js
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]

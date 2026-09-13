ARG NODE_VERSION=24-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

# Copy every workspace manifest required by the extension before installing so
# pnpm can resolve workspace dependencies while retaining dependency caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/extension/package.json ./apps/extension/package.json
COPY packages/client/package.json ./packages/client/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm install --filter extension... --frozen-lockfile

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/extension/node_modules ./apps/extension/node_modules
COPY --from=dependencies /app/packages/client/node_modules ./packages/client/node_modules
COPY --from=dependencies /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=dependencies /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=dependencies /app/packages/eslint-config/node_modules ./packages/eslint-config/node_modules

COPY apps/extension ./apps/extension
COPY packages/client ./packages/client
COPY packages/contracts ./packages/contracts
COPY packages/ui ./packages/ui
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config

RUN corepack enable pnpm && pnpm --filter extension build

# Compose uses this stage to copy the browser bundle into a bind-mounted local
# directory. It is intentionally a one-shot exporter, not an application.
FROM node:${NODE_VERSION} AS exporter

WORKDIR /extension

COPY --from=builder /app/apps/extension/.output/chrome-mv3 ./bundle

CMD ["sh", "-c", "cp -R /extension/bundle/. /output/"]

# The extension is a browser artifact, not a long-running container. This final
# stage makes the Chrome MV3 bundle exportable with Docker's --output option.
FROM scratch AS artifact

COPY --from=builder /app/apps/extension/.output/chrome-mv3 /

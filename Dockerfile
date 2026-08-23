ARG NODE_VERSION=24.11.0
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

RUN corepack enable
RUN corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod

FROM deps AS build

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:${NODE_VERSION}-alpine AS final

ENV NODE_ENV=production

USER node

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/app.js"]

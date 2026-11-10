# ==============================================================================
# Bayniks Logistics Express API — Multi-Stage Production Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy root monorepo manifests
COPY package.json package-lock.json turbo.json tsconfig.json ./

# Copy workspace dependencies required for API build
COPY packages/shared-types ./packages/shared-types
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Install dependencies cleanly
RUN npm ci

# Compile TypeScript packages and API server
RUN npm run build --workspace=@logistics/shared-types
RUN npm run build --workspace=api

# Prune development dependencies for runtime footprint reduction
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# STAGE 2: Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install wget for Docker healthcheck probe
RUN apk add --no-cache wget

# Configure app directory and non-root node user
RUN chown -R node:node /app

# Copy production dependencies, workspace manifests, and compiled artifacts
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/shared-types ./packages/shared-types
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health/live || exit 1

CMD ["node", "apps/api/dist/index.js"]


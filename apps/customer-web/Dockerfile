# ==============================================================================
# Bayniks Customer / Vendor / Admin Web App — Multi-Stage Production Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy root monorepo manifests
COPY package.json package-lock.json turbo.json tsconfig.json ./

# Copy shared workspace packages and web application
COPY packages/shared-types ./packages/shared-types
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
COPY apps/customer-web ./apps/customer-web

ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Clean install dependencies
RUN npm ci

# Build internal shared libraries
RUN npm run build --workspace=@logistics/shared-types
RUN npm run build --workspace=@logistics/ui

# Build production Next.js application
RUN npm run build --workspace=customer-web

# ------------------------------------------------------------------------------
# STAGE 2: Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for Docker healthcheck probe
RUN apk add --no-cache wget

# Create non-root node user directory permissions
RUN chown -R node:node /app

# Copy application manifests and built assets
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/customer-web/package.json ./apps/customer-web/package.json
COPY --chown=node:node --from=builder /app/apps/customer-web/public ./apps/customer-web/public
COPY --chown=node:node --from=builder /app/apps/customer-web/.next ./apps/customer-web/.next

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "start", "--workspace=customer-web"]


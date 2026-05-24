# =============================================================================
# Medicine Wheel — Docker Image
# jgwill/medicine-wheel:app
#
# Usage (via mwsrv CLI):
#   mwsrv --docker -D /path/to/project
#
# Manual usage:
#   docker run --rm -p 3940:3940 \
#     -v /path/to/project/.mw/store:/data/store \
#     -e MW_DATA_DIR=/data/store \
#     jgwill/medicine-wheel:app
# =============================================================================

# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and workspace source first (layer cache)
COPY package.json package-lock.json ./
COPY src/ ./src/
COPY mcp/ ./mcp/

# Install all dependencies (workspace packages resolved as file: refs)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy Next.js application source
COPY app/ ./app/
COPY components/ ./components/
COPY hooks/ ./hooks/
COPY lib/ ./lib/
COPY public/ ./public/
COPY next.config.mjs postcss.config.mjs tsconfig.json next-env.d.ts ./

# Build workspace packages then Next.js
RUN npm run build:packages && npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3940
ENV MW_STORAGE_PROVIDER=jsonl
ENV MW_DATA_DIR=/data/store

# Copy manifests and full node_modules from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/mcp ./mcp

# Copy pre-built Next.js output and static assets
COPY --from=builder /app/.next           ./.next
COPY --from=builder /app/public          ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Volume for persistent data
VOLUME ["/data/store"]

EXPOSE 3940

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# ==============================================================================
# Multi-Stage Dockerfile for Express Backend Control Plane
# Sub-Phase 4.1.1: Lean Node.js Alpine image with Prisma client generation
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies and Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl openssl-dev libc6-compat
WORKDIR /app

# Copy root workspace manifests & prisma schema
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/prisma ./backend/prisma

# Install dependencies for backend and shared
RUN npm ci --workspace=backend --workspace=shared

# Copy sources
COPY shared ./shared
COPY backend ./backend

# Generate Prisma client and compile TypeScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Lean Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV TERRAFORM_WORKSPACE_DIR=/app/terraform_workspaces

RUN apk add --no-cache curl openssl ca-certificates dumb-init

# Create non-root system user & group
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 -G appgroup appuser

# Create workspace directory
RUN mkdir -p /app/terraform_workspaces && \
    chown -R appuser:appgroup /app/terraform_workspaces

# Copy node_modules with compiled Prisma client
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled backend dist, templates, prisma, and package metadata
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/templates ./templates
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/tsconfig.json ./tsconfig.json
COPY --from=builder /app/backend/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:4000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/app.js"]

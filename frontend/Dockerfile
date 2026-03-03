# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache curl

# Workspace manifests – enables deterministic npm ci with the root lockfile
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# BACKEND_URL must be baked in at build time so next build writes the correct
# destination into .next/routes-manifest.json
# Default to the Compose service name so plain `docker build` also produces a
# correct image; override at build time if deploying elsewhere.
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=${BACKEND_URL}

# Use npm run --workspace which sets up node_modules/.bin PATH correctly
WORKDIR /app
RUN npm run build --workspace=frontend

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl

# Install production dependencies only using the root lockfile
# (next is in dependencies, so it is included with --omit=dev)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci --omit=dev

# Copy Next.js build output and static assets from build stage
COPY --from=build /app/frontend/.next ./frontend/.next
COPY --from=build /app/frontend/public ./frontend/public

WORKDIR /app/frontend

# Run as non-root built-in node user (uid 1000)
USER node

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD curl -f http://127.0.0.1:3000/ || exit 1

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]

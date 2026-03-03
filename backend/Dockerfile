# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache curl openssl

# Workspace manifests – enables deterministic npm ci with the root lockfile
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies (dev included for TS compile + Prisma generation)
RUN npm ci

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma client and compile TypeScript
# npm run --workspace sets up node_modules/.bin PATH correctly for the workspace
WORKDIR /app
RUN npm run prisma:generate --workspace=backend
RUN npm run build:ts --workspace=backend

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl openssl

# Install production dependencies only using the root lockfile
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev

# Copy compiled output and Prisma artefacts from build stage
# Prisma installs into the workspace-local node_modules (not hoisted to root)
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY backend/prisma ./backend/prisma

WORKDIR /app/backend

# Run as non-root built-in node user (uid 1000)
USER node

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD curl -f http://127.0.0.1:4000/health || exit 1

EXPOSE 4000

CMD ["node", "dist/start.js"]

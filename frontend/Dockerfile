# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache curl

# install all dependencies
COPY package.json ./
RUN npm install

# copy source and build Next.js for production
COPY . .

# BACKEND_URL must be baked in at build time so next build writes the correct
# destination into .next/routes-manifest.json
ARG BACKEND_URL=http://localhost:4000
ENV BACKEND_URL=${BACKEND_URL}

RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl

# install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# copy Next.js build output from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# run as non-root built-in node user (uid 1000)
USER node

EXPOSE 3000

CMD ["npm", "start"]

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache curl openssl

# install all dependencies (including devDependencies for TS compile)
COPY package.json ./
RUN npm install

# copy source
COPY . .

# generate Prisma client using the locally-installed version (avoids npx pulling latest)
RUN node_modules/.bin/prisma generate

# compile TypeScript → dist/
RUN npm run build:ts

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl openssl

# install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# copy compiled output and Prisma artefacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# run as non-root built-in node user (uid 1000)
USER node

EXPOSE 4000

CMD ["node", "dist/start.js"]

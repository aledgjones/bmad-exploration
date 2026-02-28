FROM node:22-alpine
WORKDIR /app

# install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# copy source
COPY . .

# build typescript
RUN npm run build:ts

# expose default port (can be overridden by PORT env var)
EXPOSE 4000

# The app is compiled in the image. Run a small bootstrap script rather
# than using fastify-cli to avoid ESM dependency issues.
CMD ["node", "dist/start.js"]

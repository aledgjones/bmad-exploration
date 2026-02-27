FROM node:18-alpine
WORKDIR /app

# install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# copy source
COPY . .

# build typescript
RUN npm run build:ts

EXPOSE 3000
CMD ["npm", "run", "dev"]

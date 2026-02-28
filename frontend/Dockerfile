FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache curl

# install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# copy source
COPY . .

# default port is managed via environment variable
EXPOSE 3000

# start the development server (or this could be changed to a production build later)
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install dependencies and build web
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

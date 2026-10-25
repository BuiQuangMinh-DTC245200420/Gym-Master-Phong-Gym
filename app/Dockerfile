FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]

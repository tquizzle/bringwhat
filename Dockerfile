FROM node:20

WORKDIR /app

COPY . .
RUN rm -rf node_modules package-lock.json pnpm-lock.yaml
RUN corepack enable && pnpm install
RUN pnpm run build
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
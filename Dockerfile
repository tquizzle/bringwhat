FROM node:20

WORKDIR /app

COPY . .
RUN rm -rf node_modules package-lock.json pnpm-lock.yaml
RUN corepack enable && pnpm install
# Force rebuild of better-sqlite3 using npm (more reliable for native builds)
# We use --build-from-source to guarantee it compiles on the container's architecture
RUN npm rebuild better-sqlite3 --build-from-source
RUN pnpm run build
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
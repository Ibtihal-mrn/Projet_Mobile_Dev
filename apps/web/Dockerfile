FROM node:22-slim

# Prisma a besoin d'openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (utilise la version du champ packageManager du repo)
RUN corepack enable

WORKDIR /app

# 1. copier tout le monorepo (node_modules exclu par .dockerignore)
COPY . .

# 2. installer toutes les deps du workspace
RUN pnpm install --frozen-lockfile --filter web... --filter @my-better-t-app/db...

# 3. variables placeholder UNIQUEMENT pour que le build passe la validation env
#    (elles sont écrasées au runtime par docker-compose)
ENV DATABASE_URL="postgresql://postgres:password@postgres:5432/my-better-t-app"
ENV BETTER_AUTH_SECRET="placeholder_build_secret_de_32_caracteres_min"
ENV BETTER_AUTH_URL="http://localhost:3001"
ENV CORS_ORIGIN="http://localhost:8081"
ENV NODE_ENV="production"

# 4. générer le client Prisma puis build le web
RUN pnpm --filter @my-better-t-app/db run db:generate
RUN pnpm --filter web run build

EXPOSE 3001
ENV PORT=3001

# 5. servir le bundle de production
CMD ["node", "apps/web/.output/server/index.mjs"]
# Build stage
FROM node:20-alpine AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

# Only lock + manifest first for better caching
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch

# Now copy source and build
COPY . .
RUN pnpm install --offline
RUN pnpm build

# Runtime stage
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

# Copy only what we need to run
COPY --from=build --chown=node:node /app/package.json .
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]

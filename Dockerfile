# -------- Stage 1: Install dependencies (buildtime, outside distroless) --------
FROM node:20 AS installer
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -------- Stage 2: Build your app --------
FROM node:20 AS builder
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY . .

# --- If using Prisma, add config/ENV as before, then: ---
RUN npx prisma generate
RUN npm run build

# -------- Stage 3: Distroless Production Runner --------
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

# No "USER node" — distroless images run as non-root (`65532`) by default

# Required: Copy only the built output (and node_modules if your app needs them at runtime)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# If your Next.js server requires node_modules at runtime, include them:
COPY --from=installer /app/node_modules ./node_modules

# Pass any environment variables in at container runtime (or via .env in your build artifacts)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["server.js"]
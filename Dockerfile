# -------- Stage 1: Install dependencies --------
FROM node:20 AS installer
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -------- Stage 2: Build Next.js app --------
FROM node:20 AS builder
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY . .

# --- Build Args for Firebase public config ---
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Propagate build args to env vars for Next.js at build time
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

RUN npx prisma generate
RUN npm run build

# -------- Stage 3: Minimal Distroless runner --------
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

# Copy public assets and standalone app output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# In many Next.js distroless setups, you DO need node_modules for production runtime!
COPY --from=installer /app/node_modules ./node_modules

# Environment variables (public and runtime)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Distroless uses PID 65532 (non-root) by default
EXPOSE 3000
CMD ["server.js"]
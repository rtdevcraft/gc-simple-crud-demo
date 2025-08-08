# -------- Stage 1: Minimal Secure Dependency Installation --------
FROM node:20-alpine AS deps
WORKDIR /app

# Comprehensive security update and minimal dependency installation
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++ \
        curl \
    && rm -rf /var/cache/apk/* \
    && npm config set update-notifier false \
    && npm config set fund false

# Use npm with strict security
COPY package.json package-lock.json ./
RUN npm ci --only=production \
    && npm audit fix --force \
    && npm cache clean --force

# -------- Stage 2: Secure Build Stage --------
FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies for build
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Secure build arguments with strict defaults
ARG NEXT_PUBLIC_FIREBASE_API_KEY=""
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
ARG NEXT_PUBLIC_FIREBASE_APP_ID=""
ARG DATABASE_URL=""

# Strict environment propagation with default empty strings
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY:-}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID:-}
ENV DATABASE_URL=${DATABASE_URL:-}

# Secure build process with error checking
RUN npx prisma generate \
    && npm run build \
    && find . -type f -name "*.map" -delete \
    && find . -type f -name "*.d.ts" -delete

# -------- Stage 3: Minimal Secure Runner --------
FROM node:20-alpine AS runner
WORKDIR /app

# Create minimal non-root user with restricted access
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -G nodejs -u 1001 nodejs

# Copy only production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application with proper ownership
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

# Set proper permissions - directories need execute permission
RUN find /app -type d -exec chmod 755 {} \; \
    && find /app -type f -exec chmod 644 {} \; \
    && chmod 755 /app/server.js

# Switch to non-root user
USER nodejs

# Hardened runtime configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose application port
EXPOSE 3000

# Startup command
CMD ["node", "server.js"]
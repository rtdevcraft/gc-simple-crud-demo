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

# Explicitly copy and set secure permissions
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chmod 750 . && chmod -R 640 *

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
    && npm prune --production \
    && find . -type f -name "*.map" -delete \
    && find . -type f -name "*.d.ts" -delete

# -------- Stage 3: Minimal Secure Runner --------
FROM node:20-alpine
WORKDIR /app

# Create minimal non-root user with restricted access
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -G nodejs -u 1001 nodejs \
    && mkdir -p /home/nodejs/.npm \
    && chown -R nodejs:nodejs /home/nodejs \
    && chown -R nodejs:nodejs /app

# Copy only essential artifacts with minimal permissions
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules

# Explicitly set secure file permissions
RUN chmod -R 550 /app \
    && chmod -R 440 /app/*

# Switch to non-root user
USER nodejs

# Hardened runtime configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max_old_space_size=4096 --security-revert=CVE-2023-30586"

# Expose application port
EXPOSE 3000

# Simplified health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:3000/health || exit 1

# Startup command with security flags (CORRECTED SYNTAX)
CMD ["node", "server.js"]
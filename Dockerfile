# Stage 1: Installer - Install dependencies and patch OS vulnerabilities
FROM node:20-alpine AS installer
RUN apk update && apk upgrade
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder - Build the Next.js app and patch OS vulnerabilities
FROM node:20-alpine AS builder
RUN apk update && apk upgrade
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner - Use a minimal, secure Chainguard image for production
FROM cgr.dev/chainguard/node:latest
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# The Chainguard image runs as a non-root user 'node' by default.
# We need to create the directory and give the 'node' user ownership.
USER root
RUN mkdir -p /app && chown -R node:node /app
USER node

# Copy the optimized standalone Next.js output from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# The standalone output creates a minimal server.js file to run the app
CMD ["node", "server.js"]
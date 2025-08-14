# Multi-stage build for Heaven Dolls CMS
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine as production

# Install runtime dependencies
RUN apk add --no-cache \
    vips \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S strapi && \
    adduser -S strapi -u 1001

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build --chown=strapi:strapi /app .

# Create necessary directories
RUN mkdir -p public/uploads && \
    chown -R strapi:strapi public/uploads

# Switch to non-root user
USER strapi

# Expose port
EXPOSE 1337

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:1337/_health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
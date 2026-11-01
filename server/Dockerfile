# ==============================================================================
# TripTandem Server — Production Dockerfile
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/
COPY seed.js ./

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "src/index.js"]


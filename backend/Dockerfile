# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: Production image ----
FROM node:20-alpine AS production

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove any .env files that might have been copied
RUN rm -f .env .env.*

# Switch to non-root user
USER appuser

EXPOSE 5000

CMD ["node", "index.js"]

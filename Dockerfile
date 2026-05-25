FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies (including dev for build/tests)
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

# Run any build steps if present (placeholder)
RUN if [ -f package.json ] && grep -q "build" package.json; then npm run build || true; fi

FROM node:18-alpine AS runner
WORKDIR /app

# Copy only production deps to keep image small
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]

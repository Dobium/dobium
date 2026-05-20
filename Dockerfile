# ============================================================
# Stage 1: Build React frontend
# ============================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./

# NODE_ENV must NOT be 'production' during install — npm skips devDeps otherwise
RUN NODE_ENV=development npm ci

COPY frontend/ .

# VITE_ vars must be present at build time
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# ============================================================
# Stage 2: Production Node.js server
# ============================================================
FROM node:20-slim AS production

WORKDIR /app

# Install only production Node deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Place the React build where backend/server.js expects it:
# path.join(__dirname, '..', 'frontend', 'dist')
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
# PORT is injected by Render/Railway at runtime — do not hardcode
EXPOSE 10000

CMD ["node", "backend/server.js"]

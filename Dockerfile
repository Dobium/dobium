# ============================================================
# Stage 1: Build Rust engine (Linux x86_64)
# ============================================================
FROM rust:1.78-slim AS rust-builder

WORKDIR /engine
COPY backend/engine/ .

RUN cargo build --release

# ============================================================
# Stage 2: Build React frontend
# ============================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
# NODE_ENV must NOT be 'production' here or npm ci will skip devDependencies (vite, etc.)
RUN NODE_ENV=development npm ci

COPY frontend/ .

# VITE_ vars must be present at build time — set these in Railway
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ============================================================
# Stage 3: Production Node.js server
# ============================================================
FROM node:20-slim AS production

WORKDIR /app

# Install only production Node deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source and root server
COPY backend/ ./backend/
COPY server.js ./

# Place the React build where backend/server.js expects it:
# path.join(__dirname, '..', 'frontend', 'dist')
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy compiled Rust binary and make it executable
COPY --from=rust-builder /engine/target/release/dobium-engine \
     ./backend/engine/target/release/dobium-engine
RUN chmod +x ./backend/engine/target/release/dobium-engine

# Bake default data files into the image (read-only reference copy).
# The startup script seeds these into /app/backend/data ONLY on first boot.
# On subsequent redeploys the live volume data is left untouched.
COPY backend/data/ ./backend/data-defaults/

# Startup script — seeds volume on first boot, then starts the server
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production
# PORT is intentionally NOT hardcoded — Railway injects its own PORT at runtime.
EXPOSE 3001

CMD ["./start.sh"]

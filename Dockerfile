# ============================================================
# Render / Docker — Backend only
# Vercel serves the frontend; this image runs backend/server.js
# ============================================================
FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

ENV NODE_ENV=production
# PORT is injected by Render at runtime
EXPOSE 10000

CMD ["node", "backend/server.js"]

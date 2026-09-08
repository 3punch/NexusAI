# Multi-stage: build the SPA with Node, serve it from the API image.
# Same single-origin pattern ForgeFlow-AI uses — one container, one port.

# ---- Stage 1: frontend build ----
FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-fund --no-audit
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend + static assets ----
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /build/dist ./static
ENV NEXUSAI_ENVIRONMENT=production
EXPOSE 8000
# Migrations run once at container start, before the API accepts traffic.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

# Kapar API — build from the REPO ROOT (workspaces):
#   docker build -f server/Dockerfile -t kapar-api .
# Runtime: tsx (no compile step) — right-sized for the MVP; swap for a tsc
# build if cold-start time ever matters.
FROM node:22-alpine

WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci --omit=dev --workspace server --workspace @kapar/domain --include-workspace-root=false \
    && npm install -w server tsx --no-save

COPY packages/domain packages/domain
COPY server server

ENV NODE_ENV=production
# DEMO_MODE must be explicitly enabled; production defaults to real vendors only.
ENV DEMO_MODE=false
EXPOSE 3000
WORKDIR /app/server

# Migrations run as a release step (see docs/PRODUCTION.md), NOT at boot —
# parallel boots racing migrations is how outages start.
CMD ["npx", "tsx", "src/index.ts"]

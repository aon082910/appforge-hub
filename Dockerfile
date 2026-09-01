### Build the web SPA
FROM node:22-alpine AS web-build
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

### Build the server
FROM node:22-alpine AS server-build
WORKDIR /src/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

### Install the shared runtime deps used by every generated app
FROM node:22-alpine AS runtime-build
WORKDIR /src/runtime-template
COPY server/runtime-template/package.json server/runtime-template/package-lock.json* ./
RUN npm install --omit=dev

### Final image
FROM node:22-alpine
RUN apk add --no-cache su-exec tzdata
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=server-build /src/server/dist ./dist
COPY server/runtime-template ./runtime-template
COPY --from=runtime-build /src/runtime-template/node_modules ./runtime-template/node_modules
COPY --from=web-build /src/web/dist ./web-dist
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV APPFORGE_DATA_DIR=/config \
    APPFORGE_WEB_DIST=/app/web-dist \
    APPFORGE_RUNTIME_TEMPLATE=/app/runtime-template \
    PORT=8000 \
    PUID=99 \
    PGID=100

VOLUME ["/config"]
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]

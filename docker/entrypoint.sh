#!/bin/sh
set -e

PUID="${PUID:-99}"
PGID="${PGID:-100}"

if ! getent group appforge >/dev/null 2>&1; then
  addgroup -g "$PGID" appforge 2>/dev/null || true
fi
if ! getent passwd appforge >/dev/null 2>&1; then
  adduser -D -H -u "$PUID" -G appforge appforge 2>/dev/null || true
fi

mkdir -p "$APPFORGE_DATA_DIR"
chown -R "$PUID:$PGID" "$APPFORGE_DATA_DIR" 2>/dev/null || true

exec su-exec "$PUID:$PGID" "$@"

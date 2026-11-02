#!/bin/sh
set -eu

npx prisma migrate deploy

if [ "${SEED_DEMO:-true}" = "true" ]; then
  npx tsx prisma/seed.ts
fi

exec node dist/index.js

#!/usr/bin/env bash
source ./bin/_variables.sh
source ./bin/_startup_local.sh

REDIS_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
./node_modules/.bin/nodemon src/dev.js

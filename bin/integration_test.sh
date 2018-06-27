#!/usr/bin/env bash
source ./bin/_variables.sh

. ./bin/_find_compose_services.sh

echo "${DOCKER_SRV}:${REDIS_PORT}"

REDIS_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
./node_modules/.bin/mocha test/index.js

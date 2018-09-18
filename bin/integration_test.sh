#!/usr/bin/env bash
source ./bin/_variables.sh

set -x

if [[ -z ${CI} ]]; then
  if [[ -z ${SKIP_STARTUP} ]]; then
    . ./bin/_startup_local.sh
  else
    . ./bin/_find_compose_services.sh
  fi
  REDIS_URIS="${DOCKER_SRV}:${REDIS_PORT}" ./node_modules/.bin/mocha test/integration/index.js
else
  ./node_modules/.bin/mocha test/integration/index.js
fi

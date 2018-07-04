#!/usr/bin/env bash
source ./bin/_variables.sh

if [[ -z ${SKIP_STARTUP} ]]; then
  . ./bin/_startup_local.sh
else
  . ./bin/_find_compose_services.sh
fi

if [[ "$1" == "--docker" || ! -z ${CI} ]]; then
  echo "-> Via docker"
  docker-compose -p "${PROJECT}" run test
else
  ./node_modules/.bin/mocha test/integration/index.js
fi

#!/usr/bin/env bash
source ./bin/_variables.sh

# A helper script to easily run queries / log-in to the local Dockerized Redis containers

USAGE="./bin/redis.sh [shared] \"[command]\""

if [ -z "$1" ]; then
  TARGET="shared"
else
  TARGET="$1"
  shift
fi

source ./bin/_find_compose_services.sh

if [[ "$TARGET" == "shared" || "$TARGET" == "-" ]]; then
  REDIS_TARGET="${REDIS_PORT}"
else
  echo "Usage: $USAGE"
  exit 1
fi

if [[ "$@" != "" ]]; then
  redis-cli -h ${DOCKER_SRV} -p ${REDIS_TARGET} $@
else
  redis-cli -h ${DOCKER_SRV} -p ${REDIS_TARGET}
fi

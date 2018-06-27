#!/usr/bin/env bash
source ./bin/_variables.sh

# This script launches all backend services (databases, queues, etc) and waits for them to be ready
# It's only really called "_local" because it assumes everything will run on one machine :)

if ! [ -f "package.json" ]; then
  error "This script needs to be run from the root of the repository"
fi
if [[ "$@" =~ .*\-\-clean.* ]]; then
  ./bin/clean.sh
fi

COMPOSE_CMD="docker-compose -p '${PROJECT}' up --force-recreate -d --remove-orphans redis"

DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} \
TAG=dev \
TARGET=${TARGET:-"local"} \
docker-compose -p "${PROJECT}" build

echo "$COMPOSE_CMD"

set -e
DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} \
TAG=dev \
TARGET=${TARGET:-"local"} \
${COMPOSE_CMD} 2>&1 | tee .devlog.plain
. ./bin/_find_compose_services.sh

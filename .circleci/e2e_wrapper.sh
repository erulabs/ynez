#!/bin/bash
source ./bin/_variables.sh

LOG_DEST=${CIRCLE_TEST_REPORTS:-".debug"}
[ ! -d ${LOG_DEST} ] && mkdir -p ${LOG_DEST}

docker-compose -p "${PROJECT}" run -e CI=true test

if [ $? == 0 ]; then
  echo "E2E tests passed!"
else
  # DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} TAG=dev TARGET=${1:-"local"} docker-compose stop
  for CONTAINER in redis; do
    echo -e "\n\n============= ${CONTAINER} ============="
    docker logs ${PROJECT}_${CONTAINER}_1 > ${LOG_DEST}/${CONTAINER}.log
  done
  exit 1
fi

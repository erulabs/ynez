#!/bin/bash
source ./bin/_variables.sh

LOG_DEST=${CIRCLE_TEST_REPORTS:-".debug"}
[ ! -d ${LOG_DEST} ] && mkdir -p ${LOG_DEST}

TARGET=ci ./bin/test.sh

if [ $? == 0 ]; then
  echo "Tests passed!"
else
  set -x
  for CONTAINER in redis; do
    docker logs ${PROJECT}_${CONTAINER}_1 > ${LOG_DEST}/${CONTAINER}.log
  done
  exit 1
fi

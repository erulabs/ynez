#!/usr/bin/env bash
source ./bin/_variables.sh

# Builds the project! That's basically just: Yarn, Gulp, Docker
# in that order with some helpers :)

# Usage: ./bin/build.sh [tag]
# if no [tag] is provided, containers will not be built

START_TIME=$(date +%s)

# Generate .release file information
AUTHOR=$(git log -1 | fgrep Author | sed 's/Author:\ //' | awk '{print $1}')
COMMIT_MSG=$(git log -1 | cat | tail -n +5 | sed "s/^    //" | tr '\n' ' ' | sed 's/[ \t]*$//')
COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
COMMIT_SHORT=$(echo $COMMIT_HASH | cut -c1-7)
RELEASE_TEXT="$COMMIT_SHORT: $AUTHOR '$COMMIT_MSG'"
TARGET=${1:-"local"}
TAG=${2:-${COMMIT_SHORT}}

echo "-> Building '${TAG}' for '${TARGET}'"

if [ -z $IMAGESONLY ]; then
  ./bin/clean.sh
  yarn install
  NODE_ENV="production" DEPLOY_VERSION="${COMMIT_SHORT}" ./node_modules/.bin/gulp
  NODE_ENV="production" ENV_FILE="./inf/env/${TARGET}/www.env.plain" ./node_modules/.bin/webpack-cli --env "production"
fi

if [ -z "$SKIP_IMAGES" ]; then
  echo -e "\n\n-> Building \"${DOCKER_CONTAINER_NAME}:${TAG}\": ${RELEASE_TEXT}"
  echo "${RELEASE_TEXT}" > ./.release

  if [ ! -z ${CI} ]; then
    docker pull ${DOCKER_CONTAINER_NAME}:latest || true
    docker build --cache-from ${DOCKER_CONTAINER_NAME}:latest -t ${DOCKER_CONTAINER_NAME}:${TAG} .
  else
    docker build -t ${DOCKER_CONTAINER_NAME}:${TAG} .
  fi

  docker tag ${DOCKER_CONTAINER_NAME}:${TAG} ${DOCKER_CONTAINER_NAME}:latest
else
  echo "SKIP_IMAGES set, not building containers."
fi
echo -e "\n\n-> Build done in $(($(date +%s) - $START_TIME)) seconds"

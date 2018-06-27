#!/usr/bin/env bash
source ./bin/_variables.sh

DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} TAG=${TAG:-"dev"} TARGET=${TARGET:-"local"} docker-compose -p ${PROJECT} down

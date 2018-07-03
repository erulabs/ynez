#!/usr/bin/env bash
source ./bin/_variables.sh

trap 'error_handler' ERR
function error_handler {
  echo "Unit Tests failed!"
  exit 1
}

echo "-> Service unit tests"
./node_modules/.bin/mocha test/unit/index.js

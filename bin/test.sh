#!/usr/bin/env bash
source ./bin/_variables.sh

trap 'error_handler' ERR
function error_handler {
  echo "Tests failed!"
  exit 1
}

echo -e "======================\nIntegration tests:"
TARGET=${TARGET:-local} ./bin/integration_test.sh

echo -e "======================\nUnit tests:"
./bin/unit_test.sh

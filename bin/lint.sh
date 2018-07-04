#!/usr/bin/env bash

echo -e "\nESLINT:"
./node_modules/.bin/eslint src

echo -e "\nFlow:"
./node_modules/.bin/flow check src

echo -e "\nLint OK"

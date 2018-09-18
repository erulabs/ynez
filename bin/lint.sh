#!/usr/bin/env bash

echo -e "\nESLINT:"
./node_modules/.bin/eslint lib

echo -e "\nFlow:"
[ -z ${CI} ] && ./node_modules/.bin/flow check lib

echo -e "\nLint OK"

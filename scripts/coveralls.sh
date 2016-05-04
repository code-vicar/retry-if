#!/bin/bash

npm run build \
&& istanbul cover _mocha --report lcovonly -- dist/test \
&& sed s/SF:\\/source/SF:src/ ./coverage/lcov.info | coveralls \
&& rm -rf ./coverage

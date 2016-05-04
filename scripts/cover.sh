#!/bin/bash

npm run build \
&& istanbul cover _mocha -- dist/test

#!/bin/bash

docker run -it --rm \
  -p 54783:54783 \
  --mount type=bind,source="$(pwd)"/resources,target=/resources \
  shopserver ./start.sh

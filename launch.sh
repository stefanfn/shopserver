#!/bin/bash

CONTAINER_NAME="$(basename $(pwd))"

docker run -it --rm \
  --name $CONTAINER_NAME \
  -p 54783:54783 \
  --mount type=bind,source="$(pwd)"/resources,target=/resources \
  shopserver ./start.sh

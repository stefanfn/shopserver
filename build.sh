#!/bin/bash

tar zcf files/shopserver.tar.gz shopserver

docker build -t shopserver .

rm -v files/shopserver.tar.gz


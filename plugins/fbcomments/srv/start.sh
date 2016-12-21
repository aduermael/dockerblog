#!/bin/bash

# copy initial data not replacing files in /blog-data
cp -R -u -p /data/* /blog-data/

forever start -o /logs.txt -e /logs.txt cluster.js

# we keep an interactive TTY
/bin/bash
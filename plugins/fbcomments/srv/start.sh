#!/bin/bash

/usr/bin/redis-server /etc/redis/redis.conf

forever start cluster.js

# we keep an interactive TTY
/bin/bash
#!/bin/bash
#
# CONTAINER LAUNCH SCRIPT
#

# we launch redis-server service
# will use /etc/redis/redis.conf file as config file
# service redis-server start
# since we use volumes, we need to launch the process
# with "root" rights level
/usr/bin/redis-server /etc/redis/redis.conf

# for DEV : keep a TTY open
/bin/bash

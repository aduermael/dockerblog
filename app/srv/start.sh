#!/bin/bash
#
# START SCRIPT
#

# start ssh-server
# /usr/sbin/sshd

forever start app.js

# we keep an interactive TTY
/bin/bash
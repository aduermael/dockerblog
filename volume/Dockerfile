#
# Dockerblog
# 
# https://github.com/aduermael/dockerblog
#
# volume container for dockerblog
# responsible for the file storage
# of a dockerblog instance
#
# this container will contain 2 volumes:
# - one for the blog's files (/dockerblog_files)
# - one for the redis dumps (/dockerblog_db)
#

FROM ubuntu:14.04
MAINTAINER Gaetan de Villele (gdevillele@gmail.com)

##########   USER   ############

# we define a new root password
RUN echo "root:toor" | chpasswd

##########  VOLUMES  ###########

RUN mkdir /dockerblog_files
VOLUME /dockerblog_files

RUN mkdir /dockerblog_db
VOLUME /dockerblog_db

########## ENTRYPOINT ##########

ADD start.sh /srv/start.sh

ENTRYPOINT ["/bin/bash","/srv/start.sh"]





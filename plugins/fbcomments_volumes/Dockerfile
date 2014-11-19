#
# Dockerblog
#
# https://github.com/aduermael/dockerblog
#
# volume container for fbcomments
# Used to dump redis database
# containing comments from Facebook pages
#



FROM ubuntu:14.04
MAINTAINER Adrien Duermael (adrien@duermael.com

##########  VOLUMES  ###########

RUN mkdir /fbcomments_db
VOLUME /fbcomments_db

########## ENTRYPOINT ##########

ENTRYPOINT ["/bin/true"]

#
# REDIS-SERVER container
#
# uses 14.04 with default redis-server package
#


FROM ubuntu:14.04
MAINTAINER Gaetan de Villele (gdevillele@gmail.com)


# Make sure we don't get notifications we can't answer during building.
ENV DEBIAN_FRONTEND noninteractive


################# PACKAGES ##############

# Update packages
RUN apt-get update; apt-get upgrade -y;



################# REDIS #################

# install redis-server package
RUN apt-get install -y redis-server

# redis config file is /etc/redis/redis.conf
# we use local "redis.conf.txt" file as redis config file
ADD redis.conf /etc/redis/redis.conf

# we expose redis-server service to the other containers
EXPOSE 6379


############################################

# we add bash scripts to start/stop the services of the container
ADD start_container.sh /srv/start_container.sh


# container launching command
ENTRYPOINT ["/bin/bash", "/srv/start_container.sh"]





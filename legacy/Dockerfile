FROM ubuntu:14.04
MAINTAINER Adrien Duermael (adrien@duermael.com)

# Make sure we don't get notifications we can't answer during building.
ENV DEBIAN_FRONTEND noninteractive

# -----------------------
# Update packages
# -----------------------

RUN apt-get update -y
RUN apt-get upgrade -y

# -----------------------
# Install Node.js & modules
# -----------------------

RUN apt-get install -y wget
RUN wget http://nodejs.org/dist/v0.10.28/node-v0.10.28-linux-x64.tar.gz
RUN tar -zxvf node-v0.10.28-linux-x64.tar.gz
RUN cd node-v0.10.28-linux-x64; cp -R bin/* /usr/local/bin; cp -R lib/* /usr/local/lib; cp -R share/* /usr/local/share; cp -R include/* /usr/local/include
RUN rm -r node-v0.10.28-linux-x64
RUN rm node-v0.10.28-linux-x64.tar.gz
RUN npm install forever -g

ADD package.json /tmp/package.json
RUN cd /tmp; npm install;
RUN cp -a /tmp/node_modules /srv/

# -----------------------
# Install Redis
# -----------------------

RUN apt-get install -y redis-server
ADD redis.conf /etc/redis/redis.conf

# -----------------------
# Expose ports
# -----------------------

EXPOSE 6379
EXPOSE 80

# -----------------------
# Add source files
# -----------------------

ADD srv /srv

# this data won't be copied to /blog-data, only kept within container
ADD data /data

# -----------------------
# Start server
# -----------------------

WORKDIR /srv
CMD ["/bin/bash", "./start.sh"]

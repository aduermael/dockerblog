#
# fbcomments - APP
#
#
#

FROM ubuntu:14.04
MAINTAINER Adrien Duermael (adrien@duermael.com)


# Make sure we don't get notifications we can't answer during building.
ENV DEBIAN_FRONTEND noninteractive


########## Update packages ##########

RUN apt-get update -y
RUN apt-get upgrade -y


########## Install Node.js ##########

RUN apt-get install -y wget
RUN wget http://nodejs.org/dist/v0.10.28/node-v0.10.28-linux-x64.tar.gz
RUN tar -zxvf node-v0.10.28-linux-x64.tar.gz
RUN cd node-v0.10.28-linux-x64; cp -R bin/* /usr/local/bin; cp -R lib/* /usr/local/lib; cp -R share/* /usr/local/share; cp -R include/* /usr/local/include
RUN rm -r node-v0.10.28-linux-x64
RUN rm node-v0.10.28-linux-x64.tar.gz
# install forever globally
RUN npm install forever -g
EXPOSE 80


ADD package.json /tmp/package.json
RUN cd /tmp; npm install;
RUN cp -a /tmp/node_modules /srv/


########## Add source files

ADD srv /srv

########## Define the work directory
WORKDIR /srv


########## Define default command
# ENTRYPOINT later
CMD ["/bin/bash", "./start.sh"]
# CMD ["/bin/bash"]

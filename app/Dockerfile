# 
# DOCKERBLOG - APP
# 
# 
# 

FROM ubuntu:13.04
MAINTAINER Gaetan de Villele (gdevillele@gmail.com)



# Make sure we don't get notifications we can't answer during building.
ENV DEBIAN_FRONTEND noninteractive



################# USER ################

# we define a new root password
RUN echo "root:toor" | chpasswd



########## Update packages ##########

RUN apt-get update -y; apt-get upgrade -y



########## SSH SERVER (for dev) ##########

# we install openssh server
RUN apt-get install -y openssh-server

# we need to create privilege separation directory
RUN mkdir -p /var/run/sshd

# we expose the 22 port of the container to the host 
# to be able to use SSH from a remote client
EXPOSE 22



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



########## Put blog source files
ADD srv /srv
RUN cd /srv; npm install;



########## Install redis-server (TEMPORARY)
RUN apt-get install redis-server -y
EXPOSE 6379



########## Define the work directory
WORKDIR /srv



########## Define default command
# ENTRYPOINT later
CMD ["/bin/bash"]





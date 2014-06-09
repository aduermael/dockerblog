#!/bin/bash

# 
# Clear a docker installation
#
# this script removes 
# all the containers and
# all the images of docker
#
# author  : Gaetan de Villele
# created : september 14th 2013
#

for PARAMETER in $@
do
	if [ $PARAMETER = "-c" ]; then 
		for CONTAINER in $(docker ps -a -q)
		do
			echo 'removing docker container :'
			docker rm $CONTAINER
		done
	fi

	if [ $PARAMETER = "-i" ]; then
		for IMAGE in $(docker images -q)
		do
			echo 'removing docker image :'
			docker rmi $IMAGE
		done
	fi
done










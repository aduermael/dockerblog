#!/bin/bash

COMMIT_SHORT="$1"
IMAGE_NAME="blog-router:$COMMIT_SHORT"

docker run -ti -d --restart always -e "GIN_MODE=release" -v blog-data:/blog-data -p 8080:80 --name "blog-router-test" "$IMAGE_NAME"

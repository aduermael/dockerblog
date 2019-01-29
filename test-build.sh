#!/bin/bash

COMMIT=$(git rev-parse --verify HEAD)
COMMIT_SHORT=${COMMIT:0:8}

echo "$COMMIT_SHORT"

IMAGE_NAME="blog-router:$COMMIT_SHORT"
DOCKERFILE="router.Dockerfile"

docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" .

# docker build -t blog-router

#   blog-router:
#     build:
#       context: .
#       dockerfile: router.Dockerfile
#     container_name: blog-router
#     ports:
#       - "80:80"
#     stdin_open: true
#     tty: true
#     restart: always
#     # environment: # PROD
#     #   - GIN_MODE=release # PROD
#     volumes:
#       # - blog-data:/blog-data # PROD
#       - ./sample/themes:/blog-data/themes # DEV
#       - ./sample/config.json:/blog-data/config.json # DEV
#       - ./sample/comment-answer-email.html:/blog-data/comment-answer-email.html # DEV
#       - ./sample/comment-answer-email.txt:/blog-data/comment-answer-email.txt # DEV
#       - ./sample/rss.tmpl:/blog-data/rss.tmpl # DEV
#       - ./sample/files:/blog-data/files # DEV
#       - ./router/initial-data/admin:/blog-data/admin # DEV
#       - ./router/initial-data/js:/blog-data/js # DEV
#       - ./router/initial-data/robots.txt:/blog-data/robots.txt # DEV
#       - ./go/src:/go/src # DEV
#     command: ash # DEV



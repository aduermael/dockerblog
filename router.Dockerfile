FROM golang:1.12.6-alpine3.10

# -----------------------
# Install
# -----------------------

COPY go/src /go/src
WORKDIR /go/src/blog
RUN go install

# TODO: multistage build to only keep binary

# ---------------------
# Expose ports
# ---------------------

EXPOSE 80

# -----------------------
# Add source files
# -----------------------

# initial data, files will be copied to /blog-data
# (only if they can't be found)
COPY router/initial-data /initial-data
COPY sample/config.json /initial-data/config.json
COPY sample/themes /initial-data/themes

# -----------------------
# Start blog
# -----------------------

CMD blog
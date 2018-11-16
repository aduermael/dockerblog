FROM golang:1.8.3-alpine3.5

# -----------------------
# Install router
# -----------------------

COPY go/src /go/src
WORKDIR /go/src/blog/router
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
COPY sample/comment-answer-email.html /initial-data/comment-answer-email.html
COPY sample/comment-answer-email.txt /initial-data/comment-answer-email.txt
COPY sample/rss.tmpl /initial-data/rss.tmpl
COPY sample/themes/default /initial-data/themes/default

# -----------------------
# Start router
# -----------------------

CMD router
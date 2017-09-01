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
# only if they can't be found
# (except for the theme & templates)
COPY router/initial-data /initial-data

# COPY themes/default/templates /initial-data/templates
# COPY themes/default/static /initial-data/static/theme
COPY themes/laurel/templates /initial-data/templates
COPY themes/laurel/static /initial-data/static/theme

# -----------------------
# Start router
# -----------------------

CMD router
FROM golang:1.7.3-alpine

# -----------------------
# Install router
# -----------------------

COPY src /go/src
WORKDIR /go/src/router
RUN go install

# ---------------------
# Expose ports
# ---------------------

EXPOSE 80

# -----------------------
# Add source files
# -----------------------

# initial data, files will be copied to /blog-data
# only they can't be found
ADD initial-data /initial-data

# -----------------------
# Start router
# -----------------------

CMD router
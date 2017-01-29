FROM golang:1.7.5-alpine3.5

# -----------------------
# Install router
# -----------------------

COPY src /go/src
WORKDIR /go/src/filesystem
# RUN go install

# ---------------------
# Expose ports
# ---------------------

EXPOSE 6673

# -----------------------
# Start router
# -----------------------

CMD filesystem
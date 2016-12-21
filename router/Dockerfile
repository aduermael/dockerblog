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

ADD srv /srv

# -----------------------
# Start router
# -----------------------

WORKDIR /srv
CMD ["ash", "./start.sh"]
FROM golang:1.19.6-alpine3.17 AS build-env

RUN apk update && apk add --no-cache \
	ca-certificates \
	&& rm -rf /var/cache/apk/*

COPY go/src /go/src
WORKDIR /go/src/blog

# initial data, files will be copied to /blog-data
# (only if they can't be found)
COPY router/initial-data /initial-data
COPY sample/config.json /initial-data/config.json
COPY sample/themes /initial-data/themes

EXPOSE 80

#################################

FROM build-env AS builder

RUN go build

#################################

FROM golang:1.19.6-alpine3.17 AS website

RUN apk update && apk add --no-cache \
	ca-certificates \
	&& rm -rf /var/cache/apk/*

COPY --from=builder /go/src/blog/blog /blog
COPY --from=builder /go/src/blog/helvetica-char-codes.txt /helvetica-char-codes.txt
COPY --from=builder /initial-data /initial-data

EXPOSE 80
WORKDIR /

CMD /blog
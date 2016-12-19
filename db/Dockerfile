FROM redis:3.2.6-alpine
MAINTAINER Adrien Duermael (adrien@duermael.com)

ADD redis.conf /redis/redis.conf

EXPOSE 6379

CMD ["redis-server", "/redis/redis.conf"]



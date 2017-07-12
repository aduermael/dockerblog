FROM redis:3.2.9-alpine

ADD redis.conf /redis/redis.conf

# -----------------------
# Expose ports
# -----------------------

EXPOSE 6379

# -----------------------
# Start server
# -----------------------

CMD mkdir -p /blog-data/db && redis-server /redis/redis.conf

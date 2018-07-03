# Published as erulabs/redis-unstable

FROM alpine
MAINTAINER seandon.mooy@gmail.com

ENV REDIS_VERSION=unstable

RUN apk add --no-cache make gcc wget unzip libc-dev linux-headers && \
    wget --no-check-certificate https://github.com/antirez/redis/archive/${REDIS_VERSION}.zip && \
    unzip ${REDIS_VERSION}.zip && \
    cd redis-${REDIS_VERSION} && \
    make && \
    make install && \
    mkdir -p /etc/redis && \
    sed -i "s/bind 127.0.0.1/bind 0.0.0.0/g" redis.conf && \
    cp -v redis.conf /etc/redis/ && \
    apk del make gcc wget unzip libc-dev linux-headers && \
    cd .. && \
    rm -rf redis-${REDIS_VERSION}

VOLUME ["/etc/redis"]

ENTRYPOINT ["/usr/local/bin/redis-server", "/etc/redis/redis.conf"]

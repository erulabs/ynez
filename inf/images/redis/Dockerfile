# Published as erulabs/redis-unstable

FROM alpine
MAINTAINER seandon.mooy@gmail.com

ENV REDIS_VERSION=unstable

RUN apk add --no-cache git make gcc curl libc-dev linux-headers

RUN git clone https://github.com/antirez/redis && \
    cd redis && \
    git fetch origin unstable && \
    git checkout unstable && \
    # curl -s https://github.com/antirez/redis/archive/${REDIS_VERSION}.tar.gz -o ${REDIS_VERSION}.tar.gz && \
    # tar -zxf ${REDIS_VERSION}.tar.gz && \
    # cd redis-${REDIS_VERSION} && \
    make && \
    make install && \
    mkdir -p /etc/redis && \
    sed -i "s/bind 127.0.0.1/bind 0.0.0.0/g" redis.conf && \
    cp -v redis.conf /etc/redis/ && \
    cd .. && \
    rm -rf redis-${REDIS_VERSION}

VOLUME ["/etc/redis"]

ENTRYPOINT ["/usr/local/bin/redis-server", "/etc/redis/redis.conf"]

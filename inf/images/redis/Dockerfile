# Published as erulabs/redis4-unstable

FROM alpine
MAINTAINER seandon.mooy@gmail.com


RUN apk add --no-cache make gcc wget unzip libc-dev linux-headers && \
    wget --no-check-certificate https://github.com/antirez/redis/archive/unstable.zip && \
    unzip unstable.zip && \
    cd redis-unstable && \
    make && \
    make install && \
    mkdir -p /etc/redis && \
    sed -i "s/bind 127.0.0.1/bind 0.0.0.0/g" redis.conf && \
    cp -v redis.conf /etc/redis/ && \
    apk del make gcc wget unzip libc-dev linux-headers && \
    cd .. && \
    rm -rf redis-unstable

VOLUME ["/etc/redis"]

ENTRYPOINT ["/usr/local/bin/redis-server", "/etc/redis/redis.conf"]

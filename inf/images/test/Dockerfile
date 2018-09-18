FROM node:10-alpine

WORKDIR /app

COPY package.json yarn.lock ./

RUN apk add --no-cache bash && \
    yarn install && \
    rm -rf /var/cache/* /tmp/* /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn && \
    adduser -S nodejs && \
    chown -R nodejs /app

COPY bin/ ./bin/
COPY lib/ ./lib/
COPY test/ ./test/
COPY .flowconfig .eslintrc.json .editorconfig ./

RUN chown -R nodejs /app

USER nodejs

CMD ["./bin/test.sh"]

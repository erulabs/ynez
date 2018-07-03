FROM node:10.4.0-alpine

WORKDIR /app

ENV NODE_ENV="production"

COPY package.json yarn.lock ./

RUN apk add --no-cache bash && \
    yarn install && \
    rm -rf /var/cache/* /tmp/* /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn && \
    adduser -S nodejs && \
    chown -R nodejs /app

COPY bin/_variables.sh bin/integration_test.sh ./bin/

RUN chown -R nodejs /app

USER nodejs

CMD ["./bin/integration_test.sh"]

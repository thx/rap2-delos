FROM node:8.11.1-alpine

WORKDIR /app
ADD . /tmp
RUN /bin/sh -c 'cd /tmp && npm run build && mv ./dist/* /app/ && mv ./node_modules /app/ && rm -rf /tmp'
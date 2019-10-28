# BUILDING 
FROM node:lts-alpine AS builder

LABEL maintainer="llitfkitfk@gmail.com"
WORKDIR /app

RUN apk add --no-cache git
RUN git clone --depth 1 https://github.com/thx/rap2-dolores.git ./
RUN yarn install 
COPY config/config.prod.ts ./src/config/config.prod.ts
RUN yarn run lint
RUN yarn run build

# nginx
FROM nginx:stable-alpine

COPY --from=builder /app/build /app
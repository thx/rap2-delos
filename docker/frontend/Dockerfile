# BUILDING 
FROM node:lts-alpine AS builder

LABEL maintainer="llitfkitfk@gmail.com"
WORKDIR /app

RUN apk add --no-cache git
RUN git clone --depth 1 https://github.com/thx/rap2-dolores.git ./

RUN yarn install && yarn run lint && yarn run build

# RUNNING 
FROM node:lts-alpine
LABEL maintainer="llitfkitfk@gmail.com"
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/build/* ./

CMD [ "serve", "-s", "/app", "-p", "80" ]
# BUILDING 
FROM node:lts-alpine AS builder

LABEL maintainer="llitfkitfk@gmail.com"

RUN npm install -g typescript

WORKDIR /app
# cache dependencies
COPY package.json ./
RUN npm install

# build
COPY . ./
RUN npm run build

# RUNNING
FROM node:lts-alpine

LABEL maintainer="llitfkitfk@gmail.com"
WORKDIR /app
COPY --from=builder /app/dist/* ./
COPY --from=builder /app/node_modules ./node_modules
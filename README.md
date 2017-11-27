# RAP2-DELOS CE version (back-end data API server)

[![Build Status](https://travis-ci.org/thx/rap2-delos.svg?branch=master)](https://travis-ci.org/thx/rap2-delos)


RAP2 is a new project based on [RAP1](https://github.com/thx/RAP). It has two components:

* rap2-delos: back-end data API server based on Koa + MySQL [link](http://github.com/thx/rap2-delos)
* rap2-dolores: front-end static build based on React [link](http://github.com/thx/rap2-dolores)

### Resources

* [Official Site: rap2.taobao.org](http://rap2.taobao.org)
* DingDing Group ID: 11789704

## Deployment

### development

```sh

# create database
mysql -e 'CREATE DATABASE IF NOT EXISTS RAP2_DELOS_APP DEFAULT CHARSET utf8 COLLATE utf8_general_ci'

# initialize database
npm install
npm run create-db

# execute mocha test cases & js code check
npm run check

# start server in development mode
npm run dev

```

### production

```sh
# 1. change server config in /config/config.prod.js

# 2. start server in production mode
npm start

```

## Author

* Owner: Alimama FE Team
* Author:
  * Before v2.3: all by [@Nuysoft](https://github.com/nuysoft/), creator of [mockjs](mockjs.com).
  * v2.4+ / CE version: [Bosn](http://github.com/bosn/)(creator of [RAP1](https://github.com/thx/RAP)) [Nuysoft](https://github.com/nuysoft/)
  * We are looking for more and more contributors :)


### Tech Arch

* Front-end (rap2-dolores)
    * React / Redux / Saga / Router
    * Mock.js
    * SASS / Bootstrap 4 beta
    * server: nginx
* Back-end (rap2-delos)
    * Koa
    * Sequelize
    * MySQL
    * Server
    * server: node

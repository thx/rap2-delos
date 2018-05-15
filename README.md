# RAP2-DELOS CE version (back-end data API server)

[![Build Status](https://travis-ci.org/thx/rap2-delos.svg?branch=master)](https://travis-ci.org/thx/rap2-delos)


RAP2 is a new project based on [RAP1](https://github.com/thx/RAP). It has two components:
RAP2是在RAP1基础上重做的新项目，它包含两个组件(对应两个Github Repository)。

* rap2-delos: back-end data API server based on Koa + MySQL [link](http://github.com/thx/rap2-delos)
* rap2-dolores: front-end static build based on React [link](http://github.com/thx/rap2-dolores)


* rap2-delos: 后端数据API服务器，基于Koa + MySQL[link](http://github.com/thx/rap2-delos)
* rap2-dolores: 前端静态资源，基于React [link](http://github.com/thx/rap2-dolores)

### Resources

* [Official Site 官网: rap2.taobao.org](http://rap2.taobao.org)
* DingDing Group ID 钉钉群: 11789704
* [热心网友提供的部署文档，供参考](https://github.com/thx/rap2-delos/issues/119)

## Deployment 部署

### enviaronment requirements 环境要求
* Node.js 8.9.4+
* MySQL 5.7+
* Redis 4.0+

### development 开发模式

#### install mysql and redis server
#### 安装MySQL和Redis服务器

请自行查找搭建方法，mysql/redis配置在config.*.ts文件中，在不修改任何配置的情况下，
redis会通过默认端口 + 本机即可正常访问，确保redis-server打开即可。
#### start redis-server
#### 启动redis-server
```sh
redis-server
```

后台执行可以使用nohup或pm2，这里推荐使用pm2，下面命令会安装pm2，并通过pm2来启动redis缓存服务
```bash
npm install -g pm2
npm run start:redis
```

#### create database at first
#### 先创建创建数据库

```bash
mysql -e 'CREATE DATABASE IF NOT EXISTS RAP2_DELOS_APP DEFAULT CHARSET utf8 COLLATE utf8_general_ci'
```

#### initialize 
#### 初始化
```bash
npm install
```

confirm configurations in /config/config.dev.js (used in development mode)
确认/config/config.dev.js中的配置(.dev.js后缀表示用于开发模式)

#### Install and compile TypeScript code
#### 安装 && TypeScript编译
```bash
npm install -g typescript
npm run build
```

#### initialize database tables
#### 初始化数据库表
```bash
npm run create-db
```
#### execute mocha test cases & js code check
#### 执行mocha测试用例和js代码规范检查
```bash
npm run check
```

#### start server in development mode, watch & restart automatically
#### 启动开发模式的服务器 监视并在发生代码变更时自动重启
```bash
npm run dev
```

### production 生产模式

```sh

# 1. change server config in /config/config.prod.js
# 1. 修改/config/config.prod.js中的服务器配置

# 2. start server in production mode
# 2. 启动生产模式服务器
npm start

```

## Dockerfile (本地源码通过docker运行）
```sh
# 1. 安装docker
# 2. 修改docker-compose.xml中的配置。默认使用mysql和redis的镜像。可修改为自己的配置
# 3. 通过源码运行。
        docker-compose up -d
# 4. 第一次运行需要手动初始化mysql数据库。分别执行以下命令：
        docker exec -it rap2-delos sh
    // 登录成功以后执行：
        node scripts/init
    // 执行完毕后退出
        exit
    // 如果仍然有问题，重新启动
        docker-compose down
    // 重新运行
        docker-compose up -d
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

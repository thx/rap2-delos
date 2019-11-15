# RAP2-DELOS 开源社区版本 (后端 API 服务器)

[![Build Status](https://travis-ci.org/thx/rap2-delos.svg?branch=master)](https://travis-ci.org/thx/rap2-delos)

RAP2 是在 RAP1 基础上重做的新项目，它能给你提供方便的接口文档管理、Mock、导出等功能，包含两个组件(对应两个 Github Repository)。

- rap2-delos: 后端数据 API 服务器，基于 Koa + MySQL[link](http://github.com/thx/rap2-delos)
- rap2-dolores: 前端静态资源，基于 React [link](http://github.com/thx/rap2-dolores)


**Rap 官方服务站点，无需安装直接体验: [rap2.taobao.org](http://rap2.taobao.org)**

**有急事来官方钉钉群，响应更迅速: 11789704**

***2019-10-31：现已支持 Docker 一键部署，欢迎大家体验&反馈***

***2019-09-27：更新的用户请注意按照下面指引安装 pandoc 以启用文档导出功能***


## 推荐使用 Docker 快速部署

### 安装 Docker

国内用户可参考 [https://get.daocloud.io/](https://get.daocloud.io/) 安装 Docker 以及 Docker Compose (Linux 用户需要单独安装)，建议按照链接指引配置 Docker Hub 的国内镜像提高加载速度。

### 配置项目

在任意地方建立目录 rap

把本仓库中的 [docker-compose.yml](https://raw.githubusercontent.com/thx/rap2-delos/master/docker-compose.yml) 放到 rap 目录中

Rap 前端服务的端口号默认为 3000，你可以在 docker-compose.yml 中按照注释自定义

在 rap 目录下执行下面的命令：

```sh
# 拉取镜像并启动
docker-compose up -d

# 启动后，第一次运行需要手动初始化mysql数据库
# ⚠️注意: 只有第一次该这样做
docker-compose exec delos node scripts/init

# 部署成功后 访问
http://localhost:3000 # 前端（可自定义端口号）
http://localhost:38080 # 后端

# 如果访问不了可能是数据库没有链接上，关闭 rap 服务
docker-compose down
# 再重新运行
docker-compose up -d
# 如果 Sequelize 报错可能是数据库表发生了变化，运行下面命令同步
docker-compose exec delos node scripts/updateSchema
```

**⚠️注意：第一次运行后 rap 目录下会被自动创建一个 docker 目录，里面存有 rap 的数据库数据，可千万不要删除。**

### 镜像升级

Rap 经常会进行 bugfix 和功能升级，用 Docker 可以很方便地跟随主项目升级

```sh
# 拉取一下最新的镜像
docker-compose pull
# 暂停当前应用
docker-compose down
# 重新构建并启动
docker-compose up -d --build
# 有时表结构会发生变化，执行下面命令同步
docker-compose exec delos node scripts/updateSchema
# 清空不被使用的虚悬镜像
docker image prune -f
```

## 手动部署

### 环境要求

- Node.js 8.9.4+
- MySQL 5.7+
- Redis 4.0+
- pandoc 2.73 (供文档生成使用)

### 开发模式

#### 安装 MySQL 和 Redis 服务器

请自行查找搭建方法，mysql/redis 配置在 config.\*.ts 文件中，在不修改任何配置的情况下，
redis 会通过默认端口 + 本机即可正常访问，确保 redis-server 打开即可。

注意：修改 cofig 文件后需要重新 `npm run build` 才能生效

#### 安装 pandoc

我们使用 pandoc 来生成 Rap 的离线文档，安装 Pandoc 最通用的办法是在 pandoc 的 [release 页面](https://github.com/jgm/pandoc/releases/tag/2.7.3)下载对应平台的二进制文件安装即可。

其中 linux 版本最好放在`/usr/local/bin/pandoc` 让终端能直接找到，并执行 `chmod +x /usr/local/bin/pandoc` 给调用权限。

测试在命令行执行命令 `pandoc -h` 有响应即可。

#### 启动redis-server

```sh
redis-server
```

后台执行可以使用 nohup 或 pm2，这里推荐使用 pm2，下面命令会安装 pm2，并通过 pm2 来启动 redis 缓存服务

```bash
npm install -g pm2
npm run start:redis
```

#### 先创建创建数据库

```bash
mysql -e 'CREATE DATABASE IF NOT EXISTS RAP2_DELOS_APP DEFAULT CHARSET utf8 COLLATE utf8_general_ci'
```

#### 初始化

```bash
npm install
```

confirm configurations in /config/config.dev.js (used in development mode)，确认/config/config.dev.js 中的配置(.dev.js 后缀表示用于开发模式)。

#### 安装 && TypeScript 编译

```bash
npm install -g typescript
npm run build
```

#### 初始化数据库表

```bash
npm run create-db
```

#### 执行 mocha 测试用例和 js 代码规范检查

```bash
npm run check
```

#### 启动开发模式的服务器 监视并在发生代码变更时自动重启
```bash
npm run dev
```

### 生产模式

```sh
# 1. 修改/config/config.prod.js中的服务器配置
# 2. 启动生产模式服务器
npm start

```

## 社区贡献

- [rap2-javabean 自动从 Rap 接口生成 Java Bean](https://github.com/IndiraFinish/rap2-javabean)
- [rap2-generator 把 Java Bean 生成到 Rap](https://github.com/kings1990/rap2-generator)

## Author

- 版权: 阿里妈妈前端团队
- 作者:
  - RAP2 2017/10 前版本作者为[墨智(@Nuysoft)](https://github.com/nuysoft/), [mockjs](mockjs.com)的作者。
  - 2017/10 之后版本开发者
    - [霍雍(Bosn)](http://github.com/bosn/)，[RAP1](http://github.com/thx/RAP)作者，RAP 最早的创始人。
    - [承虎(alvarto)](http://github.com/alvarto/)
    - [池冰(bigfengyu)](https://github.com/bigfengyu)

### Tech Arch

- 前端架构(rap2-dolores)
  - React / Redux / Saga / Router
  - Mock.js
  - SASS / Bootstrap 4 beta
  - server: nginx
- 后端架构(rap2-delos)
  - Koa
  - Sequelize
  - MySQL
  - Server
  - server: node

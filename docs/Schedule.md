## 2017.05.15～05.26 计划
1. RAP1 数据迁移测试
2. 发布线上服务，自测在项目中的体验
3. 编写公开 API 的文档（注释）
4. 其他参与的同学参照 v2.1 需求和约定 http://gitlab.alibaba-inc.com/thx/rap2-delos/blob/master/docs/Design.md，和仓库中的 TODO 任务注释
5. 陪产假期间在家办公，业务支持直接电话我

> TODO 消消乐

## 2017.06.12～06.16 部署

**线上 RAP1 数据迁移基本完成，正在测试迁移数据。**

### 服务端 rap2-delos
1. 正式发布部署和迁移

### 前端 rap2-dolores
1. 正式发布部署和测试

## 2017.06.05～06.09 部署

**v2.1 开发完成，部署基本完成。**

### 服务端 rap2-delos
1. 正式发布部署
    1. 接入 KeyCenter
2. 优化 分离拥有的仓库和加入的仓库
3. 优化 分离拥有的组织和加入的组织
4. 新增 fetch 拦截插件

### 前端 rap2-dolores
1. 正式发布部署
    1. 接入 线上统一登录
    2. 接入 线上域名
2. 协同 服务端的『分离拥有的仓库和加入的仓库』
3. 协同 服务端的『分离拥有的组织和加入的组织』
4. 新增 支持查看其他用户的仓库
5. 其他零散代码、视觉、交互优化
    1. 视觉 增加拥有者 icon
    2. 交互 首页 新用户显示引导文案『新建仓库』

## 2017.05.31～06.02

### 服务端 rap2-delos **2.1 开发完成**
1. 修复 数字属性、布尔属性、数组属性的解析和初始化
2. 修复 当前端发送 JSONP 请求，并且响应内容是字符串时，字符串响应再次执行 JSON.stringify()，导致响应内容格式错误
3. 增加 JSONSchema 接口 /app/mock/schema/:interfaceId
4. 完善 RAP1 迁移脚本
    1. 修正 类型 array<number|string|object|boolean> => Array
    2. 修正 模拟值 @mock=function(){} => Function
    3. 修正 顺序值 $order => Array|+1: []
5. 完善 仓库接口测试页面，支持动态仓库 id
6. 新增 支持虚拟属性 __root__
7. 正式发布部署（未完）
    1. 调整 Dockerfile 配置
    2. 接入 VIPServer
    3. 数据库上线
    4. 接入 KeyCenter（未完）

### 前端 rap2-dolores
1. 增加 生成规则帮助链接
2. 增加 访问不存在仓库的编辑器时提示 404
3. 协同 后端的『修复 数字属性、布尔属性、数组属性的解析和初始化』
4. 增加 公开接口
5. 代码优化
    1. 删除 遗留的无效注释
    2. 删除 不再使用的 Fetching 组件
    3. 增加 RModal 重定位截流
    4. 完善 登陆时只使用 email 和 password，丢弃其他属性（非 BUS SSO 场景）
    5. 删除 遗留的 corporation、product、grouping 代码
    6. 完善 补全团队列表的 propTypes
    7. 修复 不解析原始类型的初始值
    8. 部署 暂时访问 daily 环境，上线后再恢复
6. 视觉优化
    1. 增加 自动获得焦点：组织、仓库、模块、接口、属性、导入器、注册、登陆
    2. 视觉 润色首页日志格式
    3. 视觉 仓库列表和团队列表的最小高度为 10rem，增大没有找到匹配数据时的字号
    4. 恢复 团队成员头像
    5. 增加 协同仓库的帮助信息
    6. 增加 组件 Popover 支持自定义 width
    7. 视觉 组件 MembersInput 默认底部外边距 10px
    8. 视觉 润色表单 input 的宽度
    9. 视觉 移除 .rapfont，统一改用 react-icons
    10. 视觉 润色接口编辑器
    11. 新增 仓库编辑器初始加载时显示动画
7. 修复 属性类型 Number 并且初始值为 '' 时，被解析为随机字符串
8. 完善 删除团队、仓库、模块、接口时的确认提示
9. 新增 导入器支持格式化输入的 JSON
10. 修复 导入器重复调用 handleAddMemoryProperty() 丢失临时属性


## 2017.05.22～05.26

### 服务端 rap2-delos
1. 支持 迁移 RAP1 数据（开发和本地调试完成，待线上验证）
2. 完善 jQuery 插件、Mock 插件、插件文档 public/libs/README.md
3. 增加 检测和提示仓库中的重复接口
4. 修复 初始化新模块时创建了重复的示例接口
5. 支持 仓库协同（即 RAP1 的项目路由，用于指定与哪些项目共享 mock 数据）
6. 修复 creatorId 必须是当前登录用户，不需要前端传入
7. 修复 测试用例创建的临时仓库没有及时移除
8. 重构 IDB 结构设计
  1. 清理 历史遗留表 user、repository、module、interface、property、organization、organization_members、logger、notification
  2. 新建 仓库协同表 repositories_collaborators
  3. 新建 账户通知表 notifications
  4. 新增 字段 organizations.visibility，用于支持私有团队（待前端支持）
  5. 新增 字段 repositories.visibility，用于支持私有仓库（待前端支持）
9. 调整 接口 /app/get 的位置，从 routes/mock.js 分散到 routes/account|organization|repository.js
10. 修复 当创建者或拥有者已经不存在时，仓库列表和组织列表的总记录数错误
11. 支持 转移团队 /organization/transfer（待前端支持）
12. 支持 转移仓库 /repository/transfer（待前端支持）
13. 优化 获取单个仓库完整数据的性能
14. 完善 示例接口初始化时填充更多的 Mock 规则示例

### 前端 rap2-dolores
1. 修复 /app/plugin/:repositories 接收到无效 repositoryId 时报错
2. 调整 导航栏，我的仓库=>仓库，团队仓库=>组织
3. 增加 仓库/全部仓库
4. 增加 检测和提示仓库中的重复接口
5. 修复 『我创建和加入的团队』不应该有分页
6. 协同 后端的『仓库协同』
7. 视觉 润色仓库编辑器
8. 修复 仓库编辑权限的判断逻辑

## 2017.05.15～05.19

### 服务端 rap2-delos
1. 修复 团队测试用例的用户 id 不存在
2. 修复 接口 /repository/joined 不排除自己拥有的项目
3. 完善 模拟数据接口 /app/mock/:repository/:method/:url
  1. 支持响应多个仓库的数据
  2. 支持不同的 http method
  3. 完善相应的测试用例
  4. 支持过滤重复仓库 id
  5. 完善注释内容，增加关于直接通过 interface id 获取模板和数据的说明
  6. 增加请求属性和响应属性的 Mock 模板
4. 重构 IDB 结构设计，为迁移 RAP1 数据做准备
  1. 清理历史遗留表 corporation、product、grouping、project、page、action
  2. 清理历史遗留字段 property.template、property.page、property.project、module.project
  3. 利用 Sequelize 重构所有表之间的关联关系（代码更精简）
  4. 修改所有外键的命名，风格统一为 modelId（减少歧义）
  5. 调整所有涉及的模型、路由、测试用例和初始数据
5. 清理 历史 API 示例 HTML（已经全部改为测试用例）
6. 新增 前端插件适配 jQuery、Mock（待测试）
7. 完善 SQL 日志格式
8. 完善 生成数据模板时的异常日志格式
9. 完善 测试用例：用户、组织、仓库

### 前端 rap2-dolores
1. 新增 测试器 Tester（未完）
2. 引入 react-icons，因为 iconfont 的质量参差不齐，在 React 中使用不方便
3. 完善 仓库列表、组织列表的视觉：废弃 table 布局，类型文案改为 <select>
4. 修复 组件 Popover 定位错误
5. 修复 进入仓库编辑器时先展示上一次编辑过的仓库，直到当前仓库的数据返回后才会更新
6. 修复 仓库数据返回之前，会展示不完整的静态内容
7. 引入 RCodeMirror，作为接口属性导入工具的编辑器
8. 协同 后端的『重构 IDB 结构设计』
9. 优化 没有搜索到匹配的组织、仓库时的提示

## 2017.05.12

### 服务端 rap2-delos
1. 新增 Sequelize 持久化时字段值校验
2. 重构 初始数据，测试用户从 100000000 开始
3. 新增 按 name 或 id 搜索用户、仓库、组织
4. 修复 插件中的接口字段
5. 新增 属性增加生成规则字段 rule
6. 新增 所有响应 JSON 增加字段 update_date，前端可以当作版本号进行版本检测
7. 新增 用户日志 /account/logger（未完）
8. 修复 更新仓库、组织时意外变更 owner 和 creator
9. 修复 仓库的字段 members 没有成员时返回 [null] 导致前端渲染报错
10. 完善 格式化 /app/mock/:repository/:url 的响应，方便前端阅读和调试

### 前端 rap2-dolores
1. 重构 整站交互和样式，导航固定为首页、我的仓库、团队仓库、状态
2. 重构 组织相关功能，代码和逻辑更清爽条理
3. 修正 全局计数器 fetching
4. 新增 成员输入组件 MembersInput
5. 重构 仓库相关功能，代码和逻辑更清爽条理
6. 放弃 样式组件 .panel，改为 .card
7. 新增 用户日志（未完）
8. 修复 组件 build 后初始 state 为 null
9. 新增 表单验证（未完）
10. 引入 NProgress
11. 完善 表单输入一律禁用 spellcheck
12. 完善 整站开屏动画
13. 完善 预览 JSON 模板和 JSON 数据
14. 新增 RModal 组件，用于替换繁琐的 DialogController
15. 修复 接口测试时仓库 id 错误

## 2017.04.28

### 服务端 rap2-delos
1. 重构整个项目：目录结构、依赖包、代码规范 standardjs、pre-commit 检测
2. 增加测试用例 Account、Organization、Worksapce、Mock
3. v2.1 需求和约定 http://gitlab.alibaba-inc.com/thx/rap2-delos/blob/master/docs/Design.md
4. 安全修复：属性为死循环函数导致服务宕掉

### 前端 rap2-dolores
1. 接入集团统一登陆
2. 增加代码规范 standardjs、pre-commit 检测
3. 支持编辑模块、页面、接口

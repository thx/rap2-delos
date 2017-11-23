## RAP2 提供两种拦截方式

1. 引入 `libs/jquery.rap.js`
  用复写的 `jQuery.ajax` 拦截与 RAP2 接口设置匹配的 ajax 请求，然后转发至 RAP2。
2. 引入 `libs/mock.rap.js`
	由 Mock 拦截与 RAP2 接口设置匹配的 ajax 请求，然后直接返回响应数据，不会转发至 RAP2。

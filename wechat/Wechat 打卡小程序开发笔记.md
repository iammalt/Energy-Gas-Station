# 个人计划打卡小程序 · 开发笔记

> 记录 2026-09-12 从零搭建到跑通的全过程，重点是**踩过的坑和解决方法**。

## 一、项目概况

| 项目 | 内容 |
|---|---|
| 功能 | 学习打卡（嵌入式/AI/软考）+ 健身记录 + 错题本 + 统计 |
| 技术栈 | 微信小程序原生 + 微信云开发（云数据库 + 云函数） |
| 仓库 | `https://github.com/iammalt/Energy-Gas-Station.git` |
| AppID | `wx2459ecf619d7d557` |
| 云环境 | 名称 `cloud1` / **环境 ID `cloud1-d0gjmeamg9ba663fc`** |
| 页面 | index(今日) / week / month / wrongbook / stats |

## 二、目录速查

```
wechat/
├── project.config.json      # AppID、源码目录、云函数目录
├── miniprogram/             # 小程序主体
│   ├── app.js               # 入口：云开发 init、envId、取 openid
│   ├── app.json             # 注册页面 + 底部 tabBar
│   ├── app.wxss             # 全局样式
│   ├── utils/store.js       # ★ 数据库读写封装（驱动层）
│   ├── utils/util.js        # 日期/连续天数计算
│   └── pages/*/             # 每个页面 = .js 逻辑 + .wxml 结构 + .wxss 样式
└── cloudfunctions/getOpenId # 云函数：取用户 openid
```

**改东西该动哪里**

| 需求 | 文件 |
|---|---|
| 改文字/布局 | 对应页面 `.wxml` |
| 改颜色样式 | 对应页面 `.wxss` |
| 改业务逻辑 | 对应页面 `.js` |
| 增删页面/底部导航 | `app.json`（新页面必须在这注册） |
| 改数据库集合/查询 | `utils/store.js` |
| 改 AppID | `project.config.json` |
| 改云环境 ID | `miniprogram/app.js` 的 `envId` |

## 三、环境配置三要素（缺一不可）

1. **AppID** → `project.config.json` 的 `"appid"`
2. **云环境 ID** → `miniprogram/app.js` 的 `envId`
   - ⚠️ 填**环境 ID**（`cloud1-d0gjmeamg9ba663fc`），不是环境名称（`cloud1`）
   - 获取：云开发控制台 → 设置 → 环境
3. **云函数部署** → 右键 `cloudfunctions/getOpenId` → 上传并部署（云端安装依赖）
   - ⚠️ 只在 CodeBuddy 里改代码没用，必须在**微信开发者工具**里部署

数据库需建 4 个集合，权限均设「仅创建者可读写」：
`checkins` / `fitness` / `wrongbooks` / `profile`

## 四、今日踩坑记录（错误码 → 原因 → 解决）

| 报错 | 原因 | 解决 |
|---|---|---|
| `-601034` 没有权限，请先开通云开发 | 该 AppID 未开通云开发 | DevTools 点「云开发」→ 开通并创建环境 |
| `-501000` Env Not Exists | `envId` 填成了环境名 `cloud1`，或留空导致 DevTools 随机挑环境 | 填真实**环境 ID** `cloud1-d0gjmeamg9ba663fc` |
| `-502005` collection not exists: checkins | 云数据库里没建集合 | 云开发控制台 → 数据库 → 新建 4 个集合 |
| `Page "pages/xx" has not been registered yet` | 热重载残留的旧编译状态 | 点「编译」Ctrl+B 做**全量编译** |
| 健身「保存失败」却看不出原因 | `catch` 没打印错误 | 已在 `index.js` catch 里加 `console.error` + toast 显示 errMsg |
| 界面 emoji 显示成 `??` | 生成文件时 emoji 编码丢失 | 全部替换为安全字符（`√` `▼` 及文字），已清 0 |
| 真机调试 `Error: Timeout` | 手机与电脑调试通道网络问题 | 改用「预览」扫码；或确保同一 Wi-Fi、关防火墙 |
| 右键云函数没有「上传并部署」 | 在 CodeBuddy 里右键了 | 该操作只能在**微信开发者工具**的项目文件树里做 |

## 五、数据流（以“保存健身”为例）

```
点击按钮 (index.wxml bindtap="saveFitness")
  → index.js saveFitness()        校验表单
  → utils/store.js addFitness()   驱动层
  → app.js ensureOpenid()         调云函数 getOpenId 拿用户 ID
  → 云数据库 fitness.add()        持久化（按 openid 隔离）
  → loadData() 刷新界面
```

**多端同步原理**：所有数据存云端，用 `openid` 区分用户。同一微信换设备登录，数据相同。

## 六、日常开发流程

1. CodeBuddy 改代码
2. 微信开发者工具点「编译」（Ctrl+B）
3. 看日志：开发者工具底部「调试器 → Console」
4. 改了云函数 → 必须右键「上传并部署」才生效
5. 提交：`git add` → `commit` → 推送 `Energy-Gas-Station`

## 七、可忽略的 DevTools 噪音

以下都不是你的代码问题，无视即可：
- `An iframe which has both allow-scripts and allow-same-origin...`
- `LifeCycle.load fail: Cannot set a non-pending waiting value`
- `unsupported property: font-size: undefinedpx`（来自 DevTools 自身 UI）
- `DevTools failed to load SourceMap`
- `21 listeners of event WindowInfoChanged...`

## 八、MCU 视角类比（帮助理解）

| MCU 概念 | 小程序 |
|---|---|
| `main.c` / 上电初始化 | `app.js` 的 `onLaunch()` |
| 任务 / 状态机 | 页面的 `Page()`：`onLoad` / `onShow` |
| 全局变量 | `app.js` 的 `globalData` |
| 中断 / 事件回调 | `bindtap` 绑定的 js 函数 |
| 外设驱动 | `utils/store.js` |
| Flash / EEPROM | 云数据库 |
| 设备唯一 ID | `openid` |
| 编译+下载+调试 | 微信开发者工具 |

# 个人计划打卡 · 微信小程序

一个真·微信小程序，用于打卡「学习计划 + 日常健身计划」，数据使用**微信云开发（云数据库）**存储，实现手机/电脑多端同一份数据、换机不丢。零后端自建、完整可运行。

## 功能

- ?? **学习打卡**（每日 3 个固定板块）：?? 嵌入式工作流 / ?? AI 学习 / ?? 软考备考。每天每板块可勾选「完成」并记录用时（分钟）。
- ???? **日常健身打卡**：力量（核心+下肢，含平板支撑等 7 个动作）/ 跑步（10K 维持）。记录类型、时长、距离、体重、膝盖/腘窝疼痛监控（0 疼痛优先）。
- ?? **错题本**：按 EW(嵌入式)/AI/SE(软考) 分类，支持增删改查。
- ?? **周 / 月视图**：每周 7 天 × 板块总表、完成率进度条；当月日历打卡覆盖率。
- ?? **统计**：连续打卡天数、各板块周/月完成率、近 4 周趋势。

## 目录结构

```
wechat/
├── project.config.json        # 项目配置（miniprogramRoot / cloudfunctionRoot）
├── README.md
├── miniprogram/               # 小程序前端代码
│   ├── app.js / app.json / app.wxss
│   ├── sitemap.json
│   ├── utils/
│   │   ├── util.js            # 日期/统计工具
│   │   └── store.js           # 云数据库读写封装（按 openid 隔离）
│   └── pages/
│       ├── index/             # 今日打卡（tabBar）
│       ├── week/              # 周视图（tabBar）
│       ├── month/             # 月视图（tabBar）
│       ├── wrongbook/         # 错题本（tabBar）
│       └── stats/             # 统计
└── cloudfunctions/
    └── getOpenId/             # 云函数：获取 openid
```

## 一、导入开发者工具

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版）。
2. 打开开发者工具 → 导入项目 → 目录选择本仓库根目录 `wechat/`。
3. **AppID**：请填入你自己的小程序 AppID（测试号无法使用云开发）。在 `project.config.json` 中已留占位 `wxYOUR_APPID_HERE`，也可在导入界面直接填。
4. 后端服务选择「微信云开发」。

## 二、开通云开发 + 创建集合

1. 点击工具栏「云开发」→ 开通（按提示创建环境，记下**环境 ID**）。
2. 在 `miniprogram/app.js` 中，把 `globalData.envId` 的 `'your-env-id'` 改成你的环境 ID。
3. 在云开发控制台「数据库」中新建以下 4 个集合（名称必须一致）：

   | 集合名 | 字段说明 |
   |--------|----------|
   | `checkins` | `_openid, date:"YYYY-MM-DD", section:"embed|ai|exam", done:bool, duration:int, note:string` |
   | `fitness` | `_openid, date, type:"strength|run", duration, distance, weight, pain:{knee,popliteal}, note` |
   | `wrongbooks` | `_openid, prefix:"EW|AI|SE", question, myAnswer, wrongReason` |
   | `profile` | `_openid, nickname` |

4. **权限设置**：每个集合 → 权限设置 → 选择「**仅创建者可读写**」。这样查询会自动按当前用户 `openid` 过滤，保证多端同账号数据隔离与同步。

## 三、部署云函数

1. 在「云开发」→「云函数」中，右键 `cloudfunctions/getOpenId` → 上传并部署（云端安装依赖）。
2. 成功后在小程序任意页面即可通过 `wx.cloud.callFunction({ name: 'getOpenId' })` 获取 openid（本项目已在 `app.js` 自动预取）。

## 四、运行 / 真机预览 / 发布

- **编译运行**：导入后直接点「编译」，首页即可打卡并写入云数据库。
- **真机预览**：点「预览」用微信扫码；或在「云开发」中开通后手机微信打开。
- **发布**：功能验收后，在开发者工具点「上传」→ 微信公众平台提交审核 → 发布。
- **多端同步验证**：同一微信账号在另一台设备（或开发者工具）登录，进入页面即可看到同一份数据（基于 openid）。

## 说明

- 不接入任何第三方后端、不接支付、不引入付费 SDK；图表用原生进度条实现。
- 代码注释为中文，关键业务逻辑均有简短说明。
- 已避免硬编码真实姓名等敏感信息。

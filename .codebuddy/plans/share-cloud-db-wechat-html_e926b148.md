---
name: share-cloud-db-wechat-html
overview: 让微信小程序(wechat/)与单文件网页应用(HTML/打卡台.html)共享同一个微信云数据库，实现多端同数据。采用微信网页登录(unionid)对齐身份、@cloudbase/js-sdk 网页端直连、扩展 checkins 集合复用同一结构、localStorage 作为离线兜底。
todos:
  - id: prep-console
    content: 前置：开放平台绑定获取 unionid、配 Web 安全域名、checkins 加 unionid 字段并调整安全规则
    status: completed
  - id: mp-store
    content: 小程序侧：app.js 取并缓存 unionid，store.js 改按 unionid 过滤并写入扩展字段
    status: completed
    dependencies:
      - prep-console
  - id: web-sdk-login
    content: 网页侧：打卡台.html 引入 Web SDK 并接入微信网页登录获取 unionid
    status: completed
    dependencies:
      - prep-console
  - id: web-db-layer
    content: 网页侧：新增云库读写层（按 unionid）替换 localStorage 主存储
    status: completed
    dependencies:
      - web-sdk-login
  - id: web-offline
    content: 网页侧：localStorage 降级为离线缓存与写队列，恢复联网按 date+section 幂等同步
    status: completed
    dependencies:
      - web-db-layer
  - id: verify-schema
    content: 统一 checkins schema 并验证两套读写一致、多端数据互通
    status: completed
    dependencies:
      - mp-store
      - web-db-layer
  - id: docs
    content: 更新 CODEBUDDY.md 与 打卡与审核SOP.md 记录共享架构与离线策略
    status: completed
    dependencies:
      - verify-schema
---

## 用户需求

让仓库内两套前端（微信小程序 `wechat/` 与网页版 `HTML/打卡台.html`）共享同一个云数据库，实现多端同一份打卡数据。

## 产品概述

将原本各自独立存储（小程序用云数据库 `_openid` 隔离、网页用 `localStorage`）的两套打卡应用，统一到**同一个云数据库**作为唯一数据源。网页端通过微信网页登录对齐身份，使小程序与网页看到并写入同一份记录。

## 核心特性

- 身份对齐：用**微信开放平台 unionid** 作为共享主键（小程序 openid 与网页 openid 不同，必须走 unionid），小程序与网页应用绑定到同一开放平台账号。
- 网页接入：采用 `@cloudbase/js-sdk` **直连**云库（方案A），浏览器直接读写；需在云控制台配置 Web 安全域名。
- 离线策略：网页端**联网优先、localStorage 兜底**——正常读云库，断网时可读本地/写入本地队列，恢复后同步。
- 数据模型：扩展现有 `checkins` 集合，增加可选字段（topic/mode/count/accuracy/pain/deep 等），网页端填写、小程序留空，复用同一集合。
- 文档同步：更新 `CODEBUDDY.md` 与 `打卡与审核SOP.md` 记录共享架构、身份模型与安全规则。

## 技术栈选择

- 小程序端：微信原生 + `wx.cloud`（现有），`utils/store.js` 为唯一数据库读写层。
- 网页端：`@cloudbase/js-sdk`（CloudBase Web SDK）通过 CDN `<script>` 引入，保持 `打卡台.html` 单文件形态。
- 数据库：微信云开发云数据库 `checkins` 集合（扩展字段），以 `unionid` 作为跨端隔离/聚合主键。
- 身份：微信网页授权（公众号 / 开放平台网站应用）获取 `unionid`，与小程序 `getOpenId` 云函数返回的 `unionid` 对齐。

## 实现方案（高层策略）

以「云数据库为唯一数据源、unionid 为共享主键」重构两套前端的存储层，网页端经 Web SDK 直连、小程序端把过滤维度从 `_openid` 升级为 `unionid`（保留 `_openid` 兼容）。

**关键技术决策与取舍**

1. **unionid 而非 openid**：小程序 openid 与公众号网页 openid 默认不同，只有绑定同一开放平台后 `unionid` 一致，故所有查询/写入以 `unionid` 为准。
2. **Web SDK 直连（方案A）而非 HTTP 云函数中转（方案B）**：直连改动最小、可复用小程序端 `store.js` 的查询思路；代价是需在云控制台配置 Web 安全域名，并调整集合安全规则以允许网页登录态按 `unionid` 读写。
3. **离线兜底合并策略**：网页端 localStorage 仅作缓存与写队列；恢复联网后按 `(date, section)` **幂等 upsert** 合并，冲突以云库最新为准（避免重复写入，契合小程序 `upsertCheckin` 已有的幂等设计）。
4. **字段扩展向下兼容**：`checkins` 增加的可选字段对小程序透明（留空/不传），网页端填充；不改动 `fitness`/`wrongbooks`（本次聚焦 checkins 共享）。

**性能与可靠性**

- Web SDK 查询沿用小程序 `limit(1000)` 与范围查询，避免全量拉取。
- 离线写队列仅在断网时入队，恢复后批量 upsert，减少请求次数。
- `ensureOpenid`/`ensureUnionid` 用 Promise 缓存，避免重复登录与重复查询。

## 实现要点（执行细节）

- **前置（账号/控制台，非代码）**：将小程序与网页应用绑定到同一微信开放平台以获取 `unionid`；云控制台为云环境配置 **Web 安全域名**；`checkins` 集合增加 `unionid` 字段；将安全规则由「仅创建者可读写（基于 `_openid`）」调整为允许同一 `unionid` 读写（自定义规则校验 `unionid` 或新增 `unionid` 字段 + 规则表达式）。
- **小程序侧**：`app.js` 的 `ensureOpenid` 同时取并缓存 `unionid`；`store.js` 的 `upsertCheckin`/`getCheckinsRange` 改为按 `unionid` 过滤（仍写入 `_openid`，保持兼容），并在 `add/update` 时写入扩展可选字段。`getOpenId` 云函数已返回 `unionid`，仅需处理未绑定开放平台时 `unionid` 为空的情况。
- **网页侧**：`打卡台.html` 引入 `@cloudbase/js-sdk`，初始化同一 `envId`（复用 `app.js` 中的 `cloud1-...`）；实现微信网页登录拿 `unionid`；新增云库读写层（镜像 `store.js` 思路，按 `unionid` 过滤）替换 `localStorage` 主存储；`KEY`/`AUDIT_KEY` 等 localStorage 键降级为离线缓存与写队列，并保留 `wb_pa_plan_*`/`wb_pa_quiz_*`/`wb_pa_errors_*`/`wb_pa_week` 作为本地元数据缓存。

## 架构设计

```mermaid
flowchart LR
  MP[微信小程序 wechat/] -->|store.js 按 unionid 过滤| DB[(云数据库 checkins)]
  WB[网页 打卡台.html] -->|@cloudbase/js-sdk 直连| DB
  WB -. 离线缓存/写队列 .-> LS[(localStorage)]
  DB -. unionid 跨端聚合 .-> U[同一微信用户 unionid]
  style DB fill:#07C160,stroke:#fff,color:#fff
  style MP fill:#3a6,stroke:#fff,color:#fff
  style WB fill:#7c3aed,stroke:#fff,color:#fff
```

## 目录结构与修改清单

```
EnergyWechat/
├── wechat/
│   ├── miniprogram/
│   │   ├── app.js                    # [MODIFY] ensureOpenid 同时取并缓存 unionid（globalData.unionid）
│   │   └── utils/
│   │       └── store.js              # [MODIFY] 读写改按 unionid 过滤；upsertCheckin 写入扩展可选字段；保持 _openid 兼容
│   └── cloudfunctions/
│       └── getOpenId/index.js        # [MODIFY] 已返回 unionid；补充 unionid 为空时的兼容处理
├── HTML/
│   ├── 打卡台.html                    # [MODIFY] 引入 @cloudbase/js-sdk；微信网页登录拿 unionid；新增云库读写层替换主存储；localStorage 降级为离线缓存/写队列 + 恢复同步
│   └── 打卡与审核SOP.md               # [MODIFY] 补充共享数据库、网页登录、离线同步说明
├── CODEBUDDY.md                       # [MODIFY] 记录共享数据库架构、unionid 身份模型、Web SDK 接入、安全规则与离线策略
└── (云控制台，非文件)                 # Web 安全域名、checkins 加 unionid 字段、安全规则调整、开放平台绑定
```

## 关键代码结构（扩展后的 checkins 集合与网页读写接口）

```js
// 统一后的 checkins 记录结构（小程序留空可选字段，网页端填充）
// { _openid, unionid, date:"YYYY-MM-DD", section:"embed|ai|exam",
//   done:bool, duration:int, note:string,
//   topic?:string, mode?:string, count?:int, accuracy?:int, pain?:bool, deep?:string[],
//   createdAt, updatedAt }

// 网页端云库读写层接口（镜像 store.js，按 unionid 过滤）
// async function upsertCheckin({ unionid, date, section, done, duration, note, ...optional })
// async function getCheckinsRange(unionid, start, end)
```
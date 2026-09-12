# 任务：生成一个「个人计划打卡」微信小程序（微信云开发，多端云同步）

## 一、目标与形态
做一个真·微信小程序，手机微信里随时打开，用于打卡我的「学习计划 + 日常健身计划」。
数据用**微信云开发（cloud 云数据库）**存储，实现手机/电脑多端同一份数据、换机不丢。
要求：零后端自建、完整可运行、打开微信开发者工具导入即可跑。

## 二、我的打卡业务模型（必须严格对齐）
1. **学习打卡（每日，3 个固定板块）**
   - 🔧 嵌入式工作流（key: embed）
   - 🤖 AI 学习（key: ai）
   - 📚 软考备考（key: exam）
   - 每天每个板块可勾选「完成」，并记录用时（分钟）。
2. **日常健身打卡（不每天强制，按状态灵活）**
   - 工作日：核心 + 下肢力量（含**平板支撑**）。7 个动作：平板支撑(3组×渐进时长,从30s起)、蚌式开合(弹力带40磅封顶)、臀桥、侧卧直腿上抬、单腿硬拉、侧步走、单腿站立（各3组）。单次 30-40min。
   - 周末（可选）：轻松跑维持 10K（Z2 有氧，状态好就跑，6-10K）。
   - 记录：类型(力量/跑步)、时长、跑步距离、体重(kg)、疼痛监控(可选：膝盖外侧 + 腘窝，训练前/中/后，刺痛≥1 分即停)。
   - 原则：0 疼痛优先、不追 PB。
3. **错题本（wrong books）**：前缀分类 EW(嵌入式)/AI/SE(软考)，可增删改查，记录题目、我的答案、错因。
4. **周 / 月视图**：展示每周/每月打卡总表与完成率；可查看当周计划摘要。

## 三、技术栈
- 微信小程序原生（WXML / WXSS / JS 或 TS）
- 微信云开发：云数据库（collection）+ 云函数（可选，登录/统计用）
- 用户标识用 `wx.cloud` 的 `openid`（云函数 `getOpenId` 或数据库自带 `_openid`）
- 不接任何第三方后端，不接支付

## 四、云数据库集合设计（collection 建议）
- `checkins`：{ _openid, date:"YYYY-MM-DD", section:"embed|ai|exam", done:bool, duration:int, note:string, createdAt }
- `fitness`：{ _openid, date, type:"strength|run", duration, distance, weight, pain:{knee,popliteal}, note, createdAt }
- `wrongbooks`：{ _openid, prefix:"EW|AI|SE", question, myAnswer, wrongReason, createdAt }
- `profile`：{ _openid, nickname, createdAt }
> 所有查询按 _openid 过滤，保证多端同账号数据隔离与同步。

## 五、页面结构（pages）
1. `pages/index` 今日打卡（首页/ tabBar）
   - 顶部显示日期 + 今日已打卡 X/3 + 连续打卡天数
   - 3 张学习板块卡片：点「完成」弹窗填用时 → 写 `checkins`
   - 1 张「日常健身」卡片：选 力量/跑步 → 填时长/距离/体重/疼痛 → 写 `fitness`
   - 底部快捷入口：「+ 加错题」
2. `pages/week` 周视图（tabBar）：本周 7 天 × 板块 打卡总表，完成率进度条
3. `pages/month` 月视图（tabBar）：当月日历/表格，按月完成率
4. `pages/wrongbook` 错题本（tabBar）：列表 + 新增/编辑/删除，按 EW/AI/SE 筛选
5. `pages/stats` 统计：连续天数、各板块周/月完成率、趋势图（可用小程序图表组件或简单进度条）

## 六、核心逻辑
- 进入首页先 `wx.cloud.init`，拉取今日 `checkins`+`fitness` 渲染勾选态
- 打卡即写库；写库成功后本地即时更新（乐观更新）
- 连续打卡天数：按 `checkins` 中 date 连续判定（学习板块任一块完成即算当天「打卡」）
- 周/月完成率 = 已完成板块数 / 应打卡板块数（学习固定 3 块/天；健身按实际记录计）
- 多端同步：任何写操作走云数据库，其它设备重新进入页面即拉最新

## 七、UI / UX
- 现代、简洁、卡片式；主色用微信绿(#07C160)或冷静蓝，留白充足
- 支持「添加到我的小程序」引导；首屏 loading 友好
- 打卡有轻反馈（✅ 动效 / toast）
- 适配 iPhone 安全区；字号适中、老年人/户外可读

## 八、交付物（必须完整可运行）
- 完整小程序项目目录：app.js / app.json / app.wxss、各 page 的 .wxml/.wxss/.js(.ts)、
  `project.config.json`、`sitemap.json`
- 云开发初始化代码：`cloudfunctions/getOpenId`（如用）、`miniprogram/` 与 `cloudfunctions/` 目录
- 数据库初始化说明：需在云开发控制台新建哪几个 collection、是否开启「仅创建者可读写」
- 一份 `README.md`：写清 1) 微信开发者工具导入步骤 2) 开通云开发+创建 collection 3) 真机预览/发布要点
- 代码注释用中文，关键业务逻辑有简短说明

## 九、额外要求
- 不要硬编码我的真实姓名/敏感信息
- 不引入付费 SDK；图表用轻量开源或原生实现
- 输出后自检：导入开发者工具能编译通过、首页能打卡并写入云数据库、换设备登录同 openid 能看到同一份数据
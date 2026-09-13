# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Commands

This repo has **no CLI build, lint, or test runner** and no root `package.json`; both front-ends are edited and run through their own tooling (WeChat DevTools and a browser).

- **WeChat mini-program — build / run / preview**: Open 微信开发者工具 (stable), 导入项目, select the `wechat/` directory as root, fill in your own AppID, then click 编译 (compile) to run. 预览 generates a QR code for real-device testing; 上传 prepares a release. No terminal build step exists.

- **HTML web app — open / develop**: Open `HTML/打卡台.html` in any modern browser (double-click or `file://`). It is a fully self-contained single-file static app — no build, server, dependencies, or lint/test step. All data lives in the browser's `localStorage`; back it up with the in-app 导出/导入 (exports JSON `{records,audits}`). To develop, edit the single `.html` file directly and refresh the browser.

- **Lint / type check**: None configured for either project. WeChat DevTools does built-in ES6/syntax checking on compile; the HTML app is plain JS with no checker. Rely on the respective tools' console output.

- **Tests**: None. No test framework or spec files exist. Verify changes manually (mini-program: DevTools simulator + real-device; HTML: browser + export/import round-trip).

- **Deploy the cloud function** (`wechat/` only): In DevTools, right-click `cloudfunctions/getOpenId` → 上传并部署（云端安装依赖）. Publishes the function and installs `wx-server-sdk` server-side.

- **Install cloud-function deps locally** (`wechat/` only): `cd wechat/cloudfunctions/getOpenId && npm install` — only needed before a local (non-cloud) deploy of the function.

- **Switch cloud environment** (`wechat/` only): Edit `globalData.envId` in `miniprogram/app.js` and confirm the AppID in `wechat/project.config.json`; both must match your 云开发 console environment before the app can read/write.

## Architecture

The repo contains **two independent front-ends for the same personal check-in domain** (学习打卡 + 健身/康复 + 错题本 + 周/月视图), plus empty platform placeholders (`admin/`, `Android/`, `IOS/` reserved for future apps). They share the domain model and naming but **share no code and no data store** — a change in one does not affect the other.

- `wechat/` — a WeChat mini-program backed entirely by WeChat Cloud Development (云开发), a serverless BaaS. No self-built backend, no payment, no third-party SDK. Multi-device sync is via the user's `openid`.
- `HTML/打卡台.html` — a single-file offline web app for the same check-in + 审核 (review) workflow, persisting to `localStorage` and integrating with an external Markdown "vault" + conversation-agent workflow.

### `wechat/` — mini-program + cloud development

`project.config.json` declares two roots: `miniprogramRoot: miniprogram/` (frontend) and `cloudfunctionRoot: cloudfunctions/` (serverless functions). The mini-program is plain JS + WXML + WXSS (no framework, no bundler).

**Identity & data isolation (core concept).** On launch, `miniprogram/app.js` calls `wx.cloud.init(...)` then `ensureOpenid()`, which invokes the `getOpenId` cloud function (`cloudfunctions/getOpenId/index.js`). That function uses `wx-server-sdk`'s `cloud.getWXContext()` to return the caller's `OPENID`, cached on a promise (`this._openidPromise`) so it is fetched once per session. Collections (`checkins`, `fitness`, `wrongbooks`, `profile`) are set to permission **仅创建者可读写**, so every query auto-scopes to the current user — both privacy (no real names hardcoded) and multi-device sync depend on this.

**Data-access layer (`utils/store.js`).** The single chokepoint for all DB I/O and the only module calling `wx.cloud.database()` directly. Every exported function `await`s `openid()` from `app.js` then builds a `.where({ _openid: oid, ... })` query. Pages never call `wx.cloud.database()` themselves. Change persistence/schema/collections here. Patterns: `upsertCheckin` is idempotent per `(date, section)`; range queries use `_.gte(...).and(_.lte(...))` with `limit(1000)`; wrong-book getters skip the prefix filter when passed `'ALL'`.

**Shared utils (`utils/util.js`).** Pure helpers used by all pages: `formatDate` (local `YYYY-MM-DD`), `getWeekStart` (Monday-based), `weekdayText`, `WEEK_NAMES`, `calcStreak` (consecutive done-dates ending today). All date strings use local time — keep consistent when adding date logic.

**Pages.** `app.json` lists five pages; `tabBar` has four: `index` (今日), `week` (周视图), `month` (月视图), `wrongbook` (错题本). `stats` is reached via `wx.navigateTo`. Every page follows: `onShow()` → `async loadData()` firing `store` calls via `Promise.all`, then `setData(...)`. Statistics (completion rates, streaks, 4-week trend) are computed **client-side** from raw `checkins` — no server-side aggregation. UI uses native progress bars, not charting libraries.

**Domain constants.** Learning sections and wrong-book categories are hardcoded in page files, not in a config module: `index.js` `SECTIONS = [{key:'embed'},{key:'ai'},{key:'exam'}]`; `wrongbook.js` `FILTERS`/`PREFIX_NAME` for `EW`/`AI`/`SE`. These keys MUST stay in sync with the `section`/`prefix` conventions in `store.js` and the cloud collections. The fitness model (`strength`/`run`, `pain{knee,popliteal}`) is similarly string-coded.

**Data model (cloud collections).** `checkins {_openid,date,section:"embed|ai|exam",done,duration,note,createdAt}` (one row per day per section); `fitness {_openid,date,type:"strength|run",duration,distance,weight,pain:{knee,popliteal},note,createdAt}`; `wrongbooks {_openid,prefix:"EW|AI|SE",question,myAnswer,wrongReason,createdAt}`; `profile {_openid,nickname}`.

### `HTML/` — single-file offline web app (`打卡台.html`)

A self-contained static HTML file (all CSS/JS inlined) implementing a "网页版 App" for the same check-in concept but a **different paradigm**: it is offline-first and drives a two-level workflow (⚡ 快速打卡 vs 🔍 深度审核) coordinated with a conversation agent and a Markdown vault. See `HTML/打卡与审核SOP.md` for the operational manual.

**Storage.** All state is in `localStorage`. Key keys (prefix `wb_pa_`): `wb_pa_checkin` (check-in `records[]`), `wb_pa_audit` (self-review `audits[]` per date), `wb_pa_plan_<weekLabel>` (周计划缓存 JSON), `wb_pa_quiz_<weekLabel>` (习题缓存), `wb_pa_errors_<week>` (collected 错题), `wb_pa_week` (manual week paths). The app seeds demo data on first load. Export/import (`{records,audits}`) is the only backup path — recommend weekly export.

**Data model.** `SECTIONS` (in `打卡台.html`) defines the boards: `embed` (嵌入式工作流), `ai` (AI学习), `exam` (软考备考), each with `goal`, `weeklyTarget`, and a `fields[]` schema driving its form. Records carry per-section fields; audits track quick self-review and which sections got deep-reviewed (`deep[]`).

**Vault integration (key distinction).** `fileUrl()` builds links to external Markdown files (e.g. `每日计划/2026年MM月/…周计划.md`, `…习题.md`, per-board `错题本.md`); `REPO_ROOT` is inferred from the file's location. The app **does NOT write `.md` files itself** — it only collects/visualizes and, via "错误收集", copies Markdown to the clipboard for the user/agent to paste into the vault. Deep audit (批改答案 + 审笔记 + 入错题本) is performed by the conversation agent against `CLAUDE.md`/vault rules, then reflected back in the app's 深度审核工作台.

**Editing conventions.** It is one large file; keep CSS in the `<style>` block and JS in the trailing `<script>`. Follow the existing `wb_pa_*` localStorage key convention when adding caches. The SOP additionally references a 跑步康复 (running-rehab) board and weekly targets — keep any such additions consistent between `SECTIONS` and the SOP doc.

### Conventions for future edits (both projects)

- WeChat: add a page via `app.json` `pages` (and `tabBar.list`); all DB ops go through `store.js` and filter by `openid`; don't hardcode real names; avoid paid/third-party SDKs.
- HTML: keep it single-file and offline; persist via `localStorage`; never let the app write vault `.md` files directly — that stays with the agent.
- Cloud env ID lives in `wechat/miniprogram/app.js` `globalData.envId`; AppID in `wechat/project.config.json`. Keep both consistent when migrating environments.

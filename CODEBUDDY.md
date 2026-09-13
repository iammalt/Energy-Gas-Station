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

The repo contains **two front-ends for the same personal check-in domain** (学习打卡 + 健身/康复 + 错题本 + 周/月视图), plus empty platform placeholders (`admin/`, `Android/`, `IOS/` reserved for future apps). They share the domain model, naming, and — since the shared-database work — the **same cloud database** for `checkins`. Key point: both front-ends read/write one cloud collection keyed by **`unionid`** (WeChat 开放平台), so a check-in made in either app appears in the other. `fitness`/`wrongbooks` remain mini-program-only.

- `wechat/` — a WeChat mini-program backed entirely by WeChat Cloud Development (云开发), a serverless BaaS. No self-built backend, no payment, no third-party SDK. Multi-device sync is via the user's `openid`.
- `HTML/打卡台.html` — a single-file offline web app for the same check-in + 审核 (review) workflow, persisting to `localStorage` and integrating with an external Markdown "vault" + conversation-agent workflow.

### `wechat/` — mini-program + cloud development

`project.config.json` declares two roots: `miniprogramRoot: miniprogram/` (frontend) and `cloudfunctionRoot: cloudfunctions/` (serverless functions). The mini-program is plain JS + WXML + WXSS (no framework, no bundler).

**Identity & data isolation (core concept).** On launch, `miniprogram/app.js` calls `wx.cloud.init(...)` then `ensureUser()`, which invokes the `getOpenId` cloud function (`cloudfunctions/getOpenId/index.js`). That function uses `wx-server-sdk`'s `cloud.getWXContext()` to return `{ openid, appid, unionid }`, cached on a promise (`this._userPromise`) so it is fetched once per session. **`unionid` is the cross-platform key** that lets the mini-program and the web app (see below) share one `checkins` dataset; when the app is not bound to 微信开放平台, `unionid` is empty and isolation falls back to `_openid`. Collections `fitness`/`wrongbooks`/`profile` keep **仅创建者可读写**; `checkins` is set to **所有用户可读，仅创建者可读写** so the web end (different `_openid`) can read the same `unionid` rows while each end only writes its own.

**Data-access layer (`utils/store.js`).** The single chokepoint for all DB I/O and the only module calling `wx.cloud.database()` directly. Every function `await`s `user()` from `app.js` (returns `{openid, unionid}`) then builds a query via `ownerFilter()` — `{ unionid }` when unionid exists, else `{ _openid: oid }` — so the **same code path serves both isolated (openid) and cross-platform (unionid) modes**. Pages never call `wx.cloud.database()` themselves. Change persistence/schema/collections here. Patterns: `upsertCheckin` is idempotent per `(date, section)` and now also writes extended optional fields (`topic/mode/count/accuracy/pain/deep`) left empty by the mini-program; range queries use `_.gte(...).and(_.lte(...))` with `limit(1000)`; wrong-book getters skip the prefix filter when passed `'ALL'`.

**Shared utils (`utils/util.js`).** Pure helpers used by all pages: `formatDate` (local `YYYY-MM-DD`), `getWeekStart` (Monday-based), `weekdayText`, `WEEK_NAMES`, `calcStreak` (consecutive done-dates ending today). All date strings use local time — keep consistent when adding date logic.

**Pages.** `app.json` lists five pages; `tabBar` has four: `index` (今日), `week` (周视图), `month` (月视图), `wrongbook` (错题本). `stats` is reached via `wx.navigateTo`. Every page follows: `onShow()` → `async loadData()` firing `store` calls via `Promise.all`, then `setData(...)`. Statistics (completion rates, streaks, 4-week trend) are computed **client-side** from raw `checkins` — no server-side aggregation. UI uses native progress bars, not charting libraries.

**Domain constants.** Learning sections and wrong-book categories are hardcoded in page files, not in a config module: `index.js` `SECTIONS = [{key:'embed'},{key:'ai'},{key:'exam'}]`; `wrongbook.js` `FILTERS`/`PREFIX_NAME` for `EW`/`AI`/`SE`. These keys MUST stay in sync with the `section`/`prefix` conventions in `store.js` and the cloud collections. The fitness model (`strength`/`run`, `pain{knee,popliteal}`) is similarly string-coded.

**Data model (cloud collections).** `checkins {_openid, unionid?, recId?, date, section:"embed|ai|exam", done, duration, note, topic?, mode?, count?, accuracy?, pain?, deep?, createdAt, updatedAt}` — `unionid` + the optional fields (`topic/mode/count/accuracy/pain/deep`) are written by the web app and left empty by the mini-program; filtering is by `unionid` (falls back to `_openid` when unionid is absent, i.e. not bound to 开放平台). `recId` is the web app's per-record key. `fitness {_openid,date,type:"strength|run",duration,distance,weight,pain:{knee,popliteal},note,createdAt}` and `wrongbooks {_openid,prefix:"EW|AI|SE",question,myAnswer,wrongReason,createdAt}` stay mini-program-only. `profile {_openid,nickname}`.

### `HTML/` — single-file offline web app (`打卡台.html`)

A self-contained static HTML file (all CSS/JS inlined) implementing a "网页版 App" for the same check-in concept but a **different paradigm**: it is offline-first and drives a two-level workflow (? 快速打卡 vs ? 深度审核) coordinated with a conversation agent and a Markdown vault. See `HTML/打卡与审核SOP.md` for the operational manual.

**Storage (hybrid: cloud + localStorage fallback).** The primary source of truth is the **same cloud `checkins` collection** as the mini-program, accessed via `@cloudbase/js-sdk` (CDN). The cloud layer (`cloudInit/cloudLogin/cloudPull/cloudPushRec/cloudFlush/` in the script) keys records by `unionid` and upserts per `recId`. `localStorage` (`wb_pa_checkin`) is the **offline cache + write queue**: when offline or not logged in, writes go to a `writeQueue` and flush on reconnect; the first load reads local then merges cloud pulls. Login: click 「? 云同步登录」 to trigger WeChat web OAuth (requires serving over the configured Web 安全域名); without it the app stays purely local. Metadata caches (`wb_pa_plan_*`, `wb_pa_quiz_*`, `wb_pa_errors_*`, `wb_pa_week`) remain local-only. Export/import (`{records,audits}`) remains a manual backup path.

**Data model.** `SECTIONS` (in `打卡台.html`) defines the boards: `embed` (嵌入式工作流), `ai` (AI学习), `exam` (软考备考), each with `goal`, `weeklyTarget`, and a `fields[]` schema driving its form. Records carry per-section fields; audits track quick self-review and which sections got deep-reviewed (`deep[]`).

**Vault integration (key distinction).** `fileUrl()` builds links to external Markdown files (e.g. `每日计划/2026年MM月/…周计划.md`, `…习题.md`, per-board `错题本.md`); `REPO_ROOT` is inferred from the file's location. The app **does NOT write `.md` files itself** — it only collects/visualizes and, via "错误收集", copies Markdown to the clipboard for the user/agent to paste into the vault. Deep audit (批改答案 + 审笔记 + 入错题本) is performed by the conversation agent against `CLAUDE.md`/vault rules, then reflected back in the app's 深度审核工作台.

**Editing conventions.** It is one large file; keep CSS in the `<style>` block and JS in the trailing `<script>`. Follow the existing `wb_pa_*` localStorage key convention when adding caches. The SOP additionally references a 跑步康复 (running-rehab) board and weekly targets — keep any such additions consistent between `SECTIONS` and the SOP doc.

### Shared cloud database (小程序 ? 网页) — one data store, keyed by unionid

Both front-ends read/write the **same `checkins` collection**; isolation across users is by **`unionid`** (WeChat 开放平台), so the same person on the mini-program and on the web sees one merged set (the web app keys per-record by `recId`; the mini-program by `(date, section)`).

- **Identity alignment (manual console prerequisite).** A mini-program `openid` and a 公众号/web `openid` differ; they share `unionid` only after the mini-program **and** the web app are bound to the **same 微信开放平台** account. Do this first or the two ends see different data. `getOpenId` (mini-program) already returns `unionid`; the web app obtains it via WeChat web OAuth through `@cloudbase/js-sdk`.
- **Web access = `@cloudbase/js-sdk` direct (no server).** `打卡台.html` loads the SDK from CDN and calls `cloud.init({env})` with the same `envId`. Web login (`cloud.auth().weixinWebAuthProvider().signIn()`) redirects to WeChat OAuth; after return, `auth.getLoginState()` yields `unionId`. The cloud console must list the page host under **Web 安全域名**, and the page must be served over `https` (not `file://`).
- **Permission (console) — set `checkins` to 「所有用户可读，仅创建者可读写」.** The read side must NOT auto-scope by `_openid` (otherwise the web login's `_openid` would differ from the mini-program's and cross-end reads would return nothing); the write side stays creator-scoped so neither end can overwrite the other's docs. Cloud-DB rules have no `auth.unionid` variable, so cross-user isolation is enforced at the **application layer** by always filtering on `unionid`. Both web and mini-program write their own `_openid`, so each end only mutates its own rows. **Indexes (console, required):** create composite indexes `(unionid, date)` and `(unionid, recId)` on `checkins` — without them the `where({unionid})` / date-range / upsert queries fail with a "need index" error. (If `unionid` is ever empty, the fallback `_openid` path also needs an `(_openid, date)` index.)
- **Schema.** `checkins` is schemaless; the `unionid` field is created on first web write (no console schema change). Extended optional fields (`topic/mode/count/accuracy/pain/deep`) are written by the web app, left empty by the mini-program.
- **Offline strategy.** Web `localStorage` (`wb_pa_checkin`) is the offline cache + write queue. `load()` reads local; `bootstrapCloud()` pulls cloud by `unionid` and flushes `writeQueue` on reconnect; `save()` pushes only dirty records. The mini-program is always online (cloud-native).

### Conventions for future edits (both projects)

- WeChat: add a page via `app.json` `pages` (and `tabBar.list`); all DB ops go through `store.js` and filter by `unionid` (falls back to `openid` when unionid is empty); don't hardcode real names; avoid paid/third-party SDKs.
- HTML: keep it single-file; cloud is the primary store (keyed by `unionid`), `localStorage` is the offline cache/queue; never let the app write vault `.md` files directly — that stays with the agent.
- Cloud env ID lives in `wechat/miniprogram/app.js` `globalData.envId`; AppID in `wechat/project.config.json`. Keep both consistent when migrating environments.

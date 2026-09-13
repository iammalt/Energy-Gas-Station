# Energy 打卡 · Android 端

同功能安卓版，与 `wechat/`（小程序）、`HTML/`（网页）**共用同一个 CloudBase `checkins` 集合**，
以 **`unionid`** 为四端共享键。本骨架为「在线优先」（始终联网直连云库，无网络则不可用，与小程序一致）。

## 工程结构

```
Android/
├── build.gradle / settings.gradle / gradle.properties   工程与插件配置
└── app/
    ├── build.gradle                                    依赖（微信 SDK 已加；CloudBase SDK 为占位 TODO）
    └── src/main/java/com/energy/checkin/
        ├── Constants.kt                                环境/AppID/板块枚举（须与另两端一致）
        ├── CheckinContract.kt                          跨端数据契约（recId/字段/日期/周范围）
        ├── WeChatLoginHelper.kt                        微信移动应用 OAuth → 拿 unionid
        ├── CloudBaseManager.kt                         CloudBase 客户端+登录胶水层
        ├── model/UserInfo.kt                           用户身份（openid/unionid）
        ├── repository/
        │   ├── CheckinRepository.kt                    仓库接口（与平台无关）
        │   ├── LocalCheckinRepository.kt               SharedPreferences 占位，默认即可运行
        │   └── CloudBaseCheckinRepository.kt           接云模板（填空式，须补全 SDK 调用）
        ├── MainViewModel.kt                            今天各板块打卡草稿 + 加载/保存
        ├── MainActivity.kt                             主界面
        └── wxapi/WXEntryActivity.kt                   微信登录回调
```

## 立即运行（默认本地模式，无需 CloudBase）

1. 用 Android Studio 打开 `Android/` 目录（首次会提示生成 Gradle Wrapper，允许即可；或在根目录执行 `gradle wrapper`）。
2. 确认 `Constants.USE_CLOUD = false`（默认）。
3. 直接运行到模拟器/真机：数据写入本地 SharedPreferences，可验证 UI 与跨端契约逻辑。

## 接入云端（四端真正共享数据）

1. **开放平台绑定（前置，最关键）**：把本 App 的微信「移动应用」AppID 与小程序、公众号(网页) 绑定到
   **同一个微信开放平台**账号。否则四端 `unionid` 不同，数据无法合并。
2. 在 CloudBase 控制台：
   - `checkins` 权限设为 **「所有用户可读，仅创建者可读写」**（应用层按 `unionid` 隔离）。
   - 建复合索引 **`(unionid, date)`** 与 **`(unionid, recId)`**。
   - 「身份认证 → 登录方式」开启 **「微信开放平台登录」**，填入移动应用 AppID/AppSecret。
3. 在 `app/build.gradle` 取消 CloudBase Android SDK 依赖注释，替换为官方 Maven 坐标；
   在 `CloudBaseManager.init()` 完成 SDK 初始化。
4. 按所用 SDK 版本的真实 API 补全 `CloudBaseCheckinRepository`（详见文件内 TODO）；
   关键点：**upsert 必须按 `unionid + recId` 过滤**，存在则更新、不存在则新增，
   **绝不能按 `(date, section)` 直接 upsert**（会覆盖小程序/网页/其他端的记录）。
5. 把 `Constants.USE_CLOUD` 改为 `true`，填好 `ENV_ID` / `WECHAT_APP_ID` /
   `WECHAT_APP_SECRET`，并把 `AndroidManifest.xml` 中 `WXEntryActivity` 的
   `android:scheme` 改为 `"wx" + WECHAT_APP_ID`。

## 跨端契约（改一处须四端同步）

- 集合 `checkins`；隔离键 `unionid`（未绑开放平台退化为 `_openid`）。
- `recId`（原生端）= **`android_<date>_<section>`**，与小程序 `mp_`、网页 UUID 命名空间区分，
  避免跨端冲突。iOS 端请改用 `ios_` 前缀。
- 字段：`date, section, done, duration, note` + 扩展可选 `topic, mode, count, accuracy, pain, deep`。
- `section ∈ {embed, ai, exam, …}` 必须与小程序 `SECTIONS`、网页 `SECTIONS` 对齐。

> 说明：本骨架的 CloudBase/微信 SDK 调用为「填空式模板」，因官方 Android SDK 版本间 API 差异较大，
> 接入时请对照你所用 SDK 版本的实际方法名调整；**契约逻辑（上面几条）已与现有两端完全一致**。

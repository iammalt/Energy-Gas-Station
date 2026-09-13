# Energy 打卡 · iOS 端

同功能 iOS 版，与 `wechat/`（小程序）、`HTML/`（网页）、`Android/`（安卓）**共用同一个 CloudBase `checkins` 集合**，
以 **`unionid`** 为四端共享键。本骨架为「在线优先」（始终联网直连云库，无网络则不可用，与小程序一致）。

## 工程结构

```
IOS/EnergyCheckin/
├── Constants.swift              环境/AppID/板块枚举（须与另三端一致）
├── Models.swift                UserInfo / CheckinDraft
├── CheckinContract.swift       跨端数据契约（recId=ios_ 前缀/字段/日期/周范围）
├── WeChatLogin.swift           微信移动应用 OAuth → 拿 unionid
├── WeChatDelegate.swift        微信回调代理（转发 code）
├── CloudBaseManager.swift      CloudBase 客户端+登录胶水层
├── CheckinStore.swift          仓库协议 + Local（UserDefaults 占位）+ CloudBase（模板）
├── CheckinViewModel.swift      今天各板块打卡草稿 + 加载/保存
├── ContentView.swift           SwiftUI 主界面
├── EnergyCheckinApp.swift      App 入口（注册微信/回调）
└── Info.plist                 微信 URL Scheme 与查询白名单
```

> 说明：本目录只提供源码，未生成 `.xcodeproj`（无法手搓可编译工程文件）。
> 请按下方「搭建 Xcode 工程」新建工程并把上述文件拖入。

## 搭建 Xcode 工程（一次性）

1. Xcode → New Project → iOS → App；Interface 选 **SwiftUI**，Language 选 **Swift**。
2. 把 `EnergyCheckin/` 下所有 `.swift` 拖入工程（勾选 Add to target）。
3. 把本目录 `Info.plist` 的内容合并进工程的 Info.plist（或直接替换），并删除自动生成的重复键。
4. 配置：Bundle Identifier 自定义；**Deployment Target = iOS 15+**（TextField 的 `.number` 格式需要）。
5. **接入微信 SDK（Objective-C）**：
   - 下载微信开放平台 iOS SDK，把 `WXApi.h / WechatAuthSDK.h / libWeChatSDK.a`（及资源）加入工程。
   - 新建 `EnergyCheckin-Bridging-Header.h`，内容：`#import "WXApi.h"`，并在 Build Settings →
     Objective-C Bridging Header 指向它。
   - 在 Build Settings → Other Linker Flags 加 `-ObjC`。
6. 在微信开放平台把本 App 的「移动应用」AppID 填到 `Constants.wechatAppId`，
   并把 `Info.plist` 的 `CFBundleURLSchemes` 改为 `"wx" + AppID`。

## 立即运行（默认本地模式，无需 CloudBase）

- 确认 `Constants.useCloud = false`（默认）。
- 直接 Run 到模拟器/真机：数据写入 `UserDefaults`，可验证 UI 与跨端契约逻辑。
- 若只想跑 UI、暂不接微信，可临时注释 `EnergyCheckinApp.init()` 中的 `WXApi.registerApp/setDelegate`
  两行（以及 `WeChatLogin`/`WeChatDelegate` 内对 `WXApi` 的调用）；`LocalCheckinStore` 不依赖微信即可运行。

## 接入云端（四端真正共享数据）

1. **开放平台绑定（前置，最关键）**：把本 App 的微信「移动应用」AppID 与小程序、公众号(网页)、Android 绑定到
   **同一个微信开放平台**账号。否则四端 `unionid` 不同，数据无法合并。
2. 在 CloudBase 控制台：
   - `checkins` 权限设为 **「所有用户可读，仅创建者可读写」**（应用层按 `unionid` 隔离）。
   - 建复合索引 **`(unionid, date)`** 与 **`(unionid, recId)`**。
   - 「身份认证 → 登录方式」开启 **「微信开放平台登录」**，填入移动应用 AppID/AppSecret。
3. 在 `CloudBaseManager.initClient()` 完成官方 CloudBase iOS SDK 初始化。
4. 按所用 SDK 版本的真实 API 补全 `CloudBaseCheckinStore`（详见文件内 TODO）；
   关键点：**upsert 必须按 `unionid + recId` 过滤**，存在则更新、不存在则新增，
   **绝不能按 `(date, section)` 直接 upsert**（会覆盖其他端的记录）。
5. 把 `Constants.useCloud` 改为 `true`，填好 `envId` / `wechatAppId` / `wechatAppSecret`。

## 跨端契约（改一处须四端同步）

- 集合 `checkins`；隔离键 `unionid`（未绑开放平台退化为 `_openid`）。
- `recId`（iOS 端）= **`ios_<date>_<section>`**，与小程序 `mp_`、网页 UUID、Android `android_` 命名空间区分，
  避免跨端冲突。
- 字段：`date, section, done, duration, note` + 扩展可选 `topic, mode, count, accuracy, pain, deep`。
- `section ∈ {embed, ai, exam, …}` 必须与小程序 `SECTIONS`、网页 `SECTIONS`、Android `SECTIONS` 对齐。

> 说明：本骨架的 CloudBase/微信 SDK 调用为「填空式模板」，因官方 iOS SDK 版本间 API 差异较大，
> 接入时请对照你所用 SDK 版本的实际方法名调整；**契约逻辑（上面几条）已与现有三端完全一致**。

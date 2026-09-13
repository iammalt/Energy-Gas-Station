import Foundation

/// 全局常量。ENV_ID / wechatAppId 必须与小程序、网页端一致；
/// 且微信「移动应用」须与小程序、公众号绑定到【同一微信开放平台】，四端才能共享同一个 unionid。
struct Constants {
    /// CloudBase 环境 ID，与小程序一致。
    static let envId = "your-cloudbase-env-id"

    /// 微信开放平台「移动应用」AppID（不是小程序 AppID）。
    static let wechatAppId = "your-wechat-mobile-appid"

    /// 微信移动应用 AppSecret。仅用于本地用 code 换 unionid 的演示；生产建议改云函数换取。
    static let wechatAppSecret = "your-wechat-app-secret"

    /// 数据后端开关：false=本地占位（默认可跑），true=接 CloudBase（需补全 SDK 调用）。
    static let useCloud = false

    /// 板块枚举，必须与小程序 SECTIONS、网页 SECTIONS 完全对齐。
    static let sections: [CheckinSection] = [
        CheckinSection(key: "embed", name: "嵌入式学习"),
        CheckinSection(key: "ai", name: "AI 学习"),
        CheckinSection(key: "exam", name: "考证刷题"),
    ]
}

struct CheckinSection: Identifiable {
    let key: String
    let name: String
    var id: String { key }
}

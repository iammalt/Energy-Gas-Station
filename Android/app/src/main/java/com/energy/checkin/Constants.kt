package com.energy.checkin

/**
 * 全局常量。
 *
 * 注意：ENV_ID / WECHAT_APP_ID 必须与小程序（app.js 的 globalData.envId）、网页端保持一致，
 * 且微信「移动应用」与小程序、公众号必须绑定到【同一个微信开放平台】账号，
 * 四端才能拿到同一个 unionid，从而共享同一个 checkins 集合。
 */
object Constants {

    /** CloudBase 环境 ID，与小程序一致。 */
    const val ENV_ID = "your-cloudbase-env-id"

    /** 微信开放平台「移动应用」AppID（不是小程序 AppID）。 */
    const val WECHAT_APP_ID = "your-wechat-mobile-appid"

    /**
     * 微信移动应用 AppSecret。仅用于本地用 code 换取 unionid 的演示。
     * 生产建议改为「云函数换取」以避免在前端泄露 Secret。
     */
    const val WECHAT_APP_SECRET = "your-wechat-app-secret"

    /**
     * 数据后端开关：
     *  - false：使用 LocalCheckinRepository（SharedPreferences 占位），无需 CloudBase 依赖即可运行 / 调试 UI。
     *  - true ：使用 CloudBaseCheckinRepository（接云），需先补全 CloudBase Android SDK 依赖与调用。
     */
    const val USE_CLOUD = false

    /** 板块枚举。必须与小程序 SECTIONS、网页 SECTIONS 完全对齐，改一处需四端同步。 */
    val SECTIONS: List<Section> = listOf(
        Section("embed", "嵌入式学习"),
        Section("ai", "AI 学习"),
        Section("exam", "考证刷题"),
    )
}

data class Section(val key: String, val name: String)

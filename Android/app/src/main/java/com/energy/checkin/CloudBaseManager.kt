package com.energy.checkin

import android.content.Context
import model.UserInfo

/**
 * CloudBase 客户端管理（接云的"胶水层"）。
 *
 * 这里把 SDK 初始化与登录收敛到一处。目前 client 为占位：
 * 接入官方 CloudBase Android SDK 后，把下方 TODO 替换为真实初始化，
 * 并保证 `database` 返回 SDK 的 database 实例供 CloudBaseCheckinRepository 使用。
 *
 * 同时负责用微信登录拿到 unionid。
 */
object CloudBaseManager {

    /**
     * 官方 CloudBase Android SDK 客户端占位。
     * 接入示例（API 形态以官方文档为准）：
     *   private var client: CloudBase? = null
     *   fun init(ctx) { client = CloudBase.builder().envId(Constants.ENV_ID).build(ctx) }
     *   val database: Any get() = client!!.database()
     */
    private var client: Any? = null
    private var user: UserInfo? = null

    fun init(ctx: Context) {
        // TODO(接云): client = CloudBase.builder().envId(Constants.ENV_ID).build(ctx.applicationContext)
    }

    /** 确保已登录，返回 unionid。未登录则走微信登录。 */
    suspend fun ensureUser(ctx: Context): UserInfo {
        if (user != null) return user!!
        val u = WeChatLoginHelper.loginSuspend(ctx)
        user = u
        return u
    }

    fun currentUser(): UserInfo =
        user ?: throw IllegalStateException("尚未登录，请先调用 ensureUser")

    /** 数据库占位，接入 SDK 后返回真实 database 实例。 */
    val database: Any
        get() = client ?: throw IllegalStateException("CloudBase 未初始化，请在 Application/MainActivity 调用 CloudBaseManager.init()")
}

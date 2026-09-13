package com.energy.checkin.model

/**
 * 登录用户身份。
 * unionid 是四端（小程序 / 网页 / Android / iOS）共享 checkins 集合的隔离键。
 * 未绑定开放平台时 unionid 为空，此时退化用 openid 隔离（与小程序旧逻辑一致）。
 */
data class UserInfo(
    val openid: String,
    val unionid: String,
    val accessToken: String = "",
)

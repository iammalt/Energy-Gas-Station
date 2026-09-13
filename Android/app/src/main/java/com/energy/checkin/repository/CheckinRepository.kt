package com.energy.checkin.repository

import android.content.Context
import model.UserInfo

/**
 * 打卡数据仓库接口（与平台无关）。
 * 两种实现：
 *  - LocalCheckinRepository：SharedPreferences 占位，无需 CloudBase 即可运行（默认）。
 *  - CloudBaseCheckinRepository：接入 CloudBase 后的真实实现（接云时补全）。
 *
 * 文档统一为 Map<String, Any?>，字段与 checkins 集合对齐（见 CheckinContract）。
 */
interface CheckinRepository {
    /** 确保已登录，返回当前用户身份（含 unionid）。 */
    suspend fun ensureUser(ctx: Context): UserInfo

    /** 按日期范围读取（含四端数据）：返回 unionid 名下、日期在 [start,end] 内的全部记录。 */
    suspend fun getCheckinsRange(start: String, end: String): List<Map<String, Any?>>

    /** 写入或更新一条记录（按 unionid + recId upsert，只动本端自己的行）。 */
    suspend fun upsert(doc: Map<String, Any?>): Map<String, Any?>
}

package com.energy.checkin.repository

import android.content.Context
import com.energy.checkin.CloudBaseManager
import model.UserInfo

/**
 * CloudBase 真实实现（接云模板）。
 *
 * ⚠️ 本文件是"填空式模板"：默认工程未包含 CloudBase Android SDK 依赖，因此本类不会参与编译。
 * 接入步骤：
 *   1) 在 app/build.gradle 取消 CloudBase SDK 依赖注释，并替换为官方 Maven 坐标。
 *   2) 在 CloudBaseManager.init() 中完成 SDK 客户端初始化。
 *   3) 下面的数据库调用按你所用 SDK 版本的真实 API 调整（类名/方法名可能不同），
 *      但【upsert 逻辑必须保持】：按 unionid + recId 过滤，存在则更新、不存在则新增，
 *      绝不按 (date, section) 直接 upsert（否则会覆盖小程序/网页/其他端的记录）。
 *   4) 在 Constants 中把 USE_CLOUD 改为 true。
 *
 * 控制台前置（与小程序/网页共用，已配置则无需重复）：
 *   - 权限：checkins 设为「所有用户可读，仅创建者可读写」。
 *   - 索引：建复合索引 (unionid, date) 与 (unionid, recId)。
 *   - 微信登录：CloudBase 控制台「身份认证 → 登录方式」开启「微信开放平台登录」，填移动应用 AppID/Secret。
 */
class CloudBaseCheckinRepository : CheckinRepository {

    // 占位：接入 SDK 后改为 client.database().collection("checkins") 的真实对象。
    private val collection: Any
        get() = error("请按 CloudBase Android SDK 真实 API 实现：database().collection(\"checkins\")")

    override suspend fun ensureUser(ctx: Context): UserInfo = CloudBaseManager.ensureUser(ctx)

    override suspend fun getCheckinsRange(start: String, end: String): List<Map<String, Any?>> {
        val u = CloudBaseManager.currentUser()
        // 按 unionid 拉取（限制 1000），日期范围在 Kotlin 侧过滤，避免依赖范围查询语法差异。
        // 真实 SDK 示例（形态以官方为准）：
        //   val snap = collection.where(mapOf("unionid" to u.unionid)).limit(1000).get().await()
        //   return snap.documents.filter { it["date"] in start..end }.map { it.toMap() }
        return emptyList() // TODO(接云): 实现后返回真实数据
    }

    override suspend fun upsert(doc: Map<String, Any?>): Map<String, Any?> {
        val recId = doc["recId"] as String
        val unionid = doc["unionid"] as String
        // 1) 查是否已存在本端 recId
        //   val snap = collection.where(mapOf("unionid" to unionid, "recId" to recId)).limit(1).get().await()
        // 2) 存在则更新，不存在则新增（去掉 recId 之外的查询字段，仅更新业务字段）
        //   if (snap.isEmpty()) { val id = collection.add(doc).await(); return doc + ("_id" to id) }
        //   else { val id = snap.first()["_id"]; collection.doc(id).update(doc).await(); return doc + ("_id" to id) }
        return doc // TODO(接云): 实现后返回云端结果
    }
}

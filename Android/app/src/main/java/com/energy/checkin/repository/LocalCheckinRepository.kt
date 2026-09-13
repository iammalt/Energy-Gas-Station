package com.energy.checkin.repository

import android.content.Context
import android.content.SharedPreferences
import model.UserInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * 本地占位实现（SharedPreferences）。
 *
 * 作用：
 *  - 在未接入 CloudBase SDK 时即可运行 / 调试 UI 与跨端契约逻辑。
 *  - 它的 upsert 逻辑与 CloudBaseCheckinRepository 完全一致（按 unionid+recId），
 *    便于后续无缝切换到云端：只要换成云端实现，读写行为保持一致。
 *
 * 注意：本实现仅为开发与演示，不会与其他端真实同步；接云后请改用 CloudBaseCheckinRepository。
 */
class LocalCheckinRepository(private val ctx: Context) : CheckinRepository {

    private val prefs: SharedPreferences by lazy {
        ctx.getSharedPreferences("energy_checkin_local", Context.MODE_PRIVATE)
    }

    override suspend fun ensureUser(ctx: Context): UserInfo =
        UserInfo(openid = "local-openid", unionid = "local-unionid")

    override suspend fun getCheckinsRange(start: String, end: String): List<Map<String, Any?>> {
        return loadAll().filter { (it["date"] as? String)?.let { d -> d >= start && d <= end } == true }
    }

    override suspend fun upsert(doc: Map<String, Any?>): Map<String, Any?> {
        val recId = doc["recId"] as String
        val unionid = doc["unionid"] as String
        val list = loadAll().toMutableList()
        val idx = list.indexOfFirst {
            it["recId"] == recId && it["unionid"] == unionid
        }
        val stored = if (idx >= 0) {
            val existing = list[idx].toMutableMap()
            existing.putAll(doc)
            list[idx] = existing
            existing
        } else {
            val created = doc.toMutableMap().also { it["_id"] = "local_" + System.nanoTime() }
            list.add(created)
            created
        }
        saveAll(list)
        return stored
    }

    private fun loadAll(): MutableList<MutableMap<String, Any?>> {
        val raw = prefs.getString("records", "[]") ?: "[]"
        val arr = JSONArray(raw)
        val out = mutableListOf<MutableMap<String, Any?>>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            val m = mutableMapOf<String, Any?>()
            obj.keys().forEach { k -> m[k] = obj.get(k) }
            out.add(m)
        }
        return out
    }

    private fun saveAll(list: List<Map<String, Any?>>) {
        val arr = JSONArray()
        list.forEach { m ->
            val obj = JSONObject()
            m.forEach { (k, v) -> obj.put(k, v ?: JSONObject.NULL) }
            arr.put(obj)
        }
        prefs.edit().putString("records", arr.toString()).apply()
    }
}

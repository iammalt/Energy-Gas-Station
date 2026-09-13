package com.energy.checkin

import android.util.Log
import java.util.Calendar

/**
 * 跨端数据契约（平台无关）。
 *
 * 这是防止四端冲突的核心，必须与小程序 utils/store.js、网页 打卡台.html 的字段/键完全一致：
 *  - 集合名：checkins
 *  - 隔离键：unionid（退化为 _openid）
 *  - recId（原生端）：固定前缀 "android_" + date + "_" + section
 *        —— 与小程序 "mp_" 前缀、网页端 UUID 命名空间互不冲突，避免跨端用 (date,section) 互相覆盖。
 *  - 字段：date, section, done, duration, note,
 *        以及扩展可选字段 topic, mode, count, accuracy, pain, deep（由网页/原生端写入，小程序留空）。
 *
 * 任何一端改枚举或字段，都需四端同步。
 */
object CheckinContract {

    private const val TAG = "CheckinContract"

    /** 原生端 recId 命名空间；iOS 端请改用 "ios_" 前缀。 */
    fun computeRecId(date: String, section: String): String = "android_${date}_${section}"

    /**
     * 构建写入文档（与小程序/网页 checkins 集合字段对齐）。
     * 始终写入 unionid；_openid 由 CloudBase SDK 自动填充。
     */
    fun buildDoc(
        user: model.UserInfo,
        date: String,
        section: String,
        done: Boolean,
        duration: Int,
        note: String,
        topic: String? = null,
        mode: String? = null,
        count: Int? = null,
        accuracy: Int? = null,
        pain: String? = null,
        deep: Boolean? = null,
    ): Map<String, Any?> {
        val recId = computeRecId(date, section)
        val doc = linkedMapOf<String, Any?>(
            "recId" to recId,
            "unionid" to user.unionid,
            "date" to date,
            "section" to section,
            "done" to done,
            "duration" to duration,
            "note" to note,
            "topic" to topic,
            "mode" to mode,
            "count" to count,
            "accuracy" to accuracy,
            "pain" to pain,
            "deep" to deep,
            "updatedAt" to System.currentTimeMillis(),
        )
        Log.d(TAG, "buildDoc recId=$recId unionid=${user.unionid} section=$section")
        return doc.filterValues { it != null }
    }

    /** 本地 YYYY-MM-DD（与小程序 util.js formatDate 一致）。 */
    fun today(): String {
        val c = Calendar.getInstance()
        return fmt(c)
    }

    /** 本周一 ~ 本周日（周一为一周起点，与小程序 getWeekStart 一致）。 */
    fun weekRange(): Pair<String, String> {
        val c = Calendar.getInstance()
        val dow = c.get(Calendar.DAY_OF_WEEK) // 1=Sun
        val offset = (dow + 5) % 7            // 距周一的天数（Mon=0）
        c.add(Calendar.DATE, -offset)
        val start = fmt(c)
        c.add(Calendar.DATE, 6)
        val end = fmt(c)
        return start to end
    }

    private fun fmt(c: Calendar): String =
        "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DATE))
}

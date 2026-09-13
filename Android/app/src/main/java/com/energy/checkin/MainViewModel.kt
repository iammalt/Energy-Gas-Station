package com.energy.checkin

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.energy.checkin.repository.CheckinRepository
import com.energy.checkin.repository.CloudBaseCheckinRepository
import com.energy.checkin.repository.LocalCheckinRepository
import model.UserInfo

/**
 * 主界面 ViewModel：维护"今天各板块打卡草稿"，并负责加载/保存。
 * 数据后端通过 Constants.USE_CLOUD 在 Local/CloudBase 之间切换，UI 与契约逻辑不变。
 */
class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val repo: CheckinRepository =
        if (Constants.USE_CLOUD) CloudBaseCheckinRepository() else LocalCheckinRepository(app)

    private val _drafts = MutableLiveData<Map<String, CheckinDraft>>(emptyMap())
    val drafts: LiveData<Map<String, CheckinDraft>> = _drafts

    val status = MutableLiveData("点击「加载」开始")

    private var user: UserInfo? = null

    private suspend fun ensureUser(): UserInfo {
        if (user == null) user = repo.ensureUser(getApplication())
        return user!!
    }

    /** 加载本周数据并填充今天各板块草稿。 */
    suspend fun load() {
        val u = ensureUser()
        val (start, end) = CheckinContract.weekRange()
        val all = repo.getCheckinsRange(start, end)
        val today = CheckinContract.today()
        val map = mutableMapOf<String, CheckinDraft>()
        for (sec in Constants.SECTIONS) {
            val rec = all.firstOrNull { it["date"] == today && it["section"] == sec.key }
            map[sec.key] = CheckinDraft(
                done = rec?.get("done") as? Boolean ?: false,
                duration = (rec?.get("duration") as? Number)?.toInt() ?: 0,
                note = (rec?.get("note") as? String) ?: "",
            )
        }
        _drafts.postValue(map)
        status.postValue("已加载 ${all.size} 条（本周），今天 ${Constants.SECTIONS.size} 个板块")
    }

    /** 保存今天各板块草稿到仓库（按 unionid+recId upsert）。 */
    suspend fun save(current: Map<String, CheckinDraft>) {
        val u = ensureUser()
        val today = CheckinContract.today()
        for (sec in Constants.SECTIONS) {
            val d = current[sec.key] ?: continue
            val doc = CheckinContract.buildDoc(
                user = u,
                date = today,
                section = sec.key,
                done = d.done,
                duration = d.duration,
                note = d.note,
            )
            repo.upsert(doc)
        }
        status.postValue("已保存 ${Constants.SECTIONS.size} 个板块（今天 $today）")
    }

    /** 仅更新内存草稿（UI 编辑时用）。 */
    fun updateDraft(key: String, draft: CheckinDraft) {
        val next = (_drafts.value ?: emptyMap()).toMutableMap()
        next[key] = draft
        _drafts.postValue(next)
    }
}

data class CheckinDraft(
    val done: Boolean,
    val duration: Int,
    val note: String,
)

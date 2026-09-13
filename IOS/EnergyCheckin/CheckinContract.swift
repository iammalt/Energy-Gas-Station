import Foundation

/// 跨端数据契约（平台无关，必须与小程序 utils/store.js、网页 打卡台.html 完全一致）。
///  - 集合：checkins
///  - 隔离键：unionid（未绑开放平台退化 _openid）
///  - recId（原生端）：固定前缀 "ios_" + date + "_" + section
///        —— 与小程序 "mp_"、网页 UUID、Android "android_" 命名空间互不冲突，避免跨端覆盖。
///  - 字段：date, section, done, duration, note + 扩展可选 topic/mode/count/accuracy/pain/deep
enum CheckinContract {

    /// 原生端 recId 命名空间（iOS）。
    static func computeRecId(date: String, section: String) -> String {
        return "ios_\(date)_\(section)"
    }

    /// 构建写入文档（与 checkins 集合字段对齐）。始终写入 unionid；_openid 由 CloudBase SDK 自动填充。
    static func buildDoc(user: UserInfo,
                        date: String,
                        section: String,
                        done: Bool,
                        duration: Int,
                        note: String,
                        topic: String? = nil,
                        mode: String? = nil,
                        count: Int? = nil,
                        accuracy: Int? = nil,
                        pain: String? = nil,
                        deep: Bool? = nil) -> [String: Any] {
        var doc: [String: Any] = [
            "recId": computeRecId(date: date, section: section),
            "unionid": user.unionid,
            "date": date,
            "section": section,
            "done": done,
            "duration": duration,
            "note": note,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000),
        ]
        if let topic { doc["topic"] = topic }
        if let mode { doc["mode"] = mode }
        if let count { doc["count"] = count }
        if let accuracy { doc["accuracy"] = accuracy }
        if let pain { doc["pain"] = pain }
        if let deep { doc["deep"] = deep }
        return doc
    }

    /// 本地 YYYY-MM-DD。
    static func today() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f.string(from: Date())
    }

    /// 本周一 ~ 本周日（周一为一周起点，与小程序 getWeekStart 一致）。
    static func weekRange() -> (start: String, end: String) {
        let cal = Calendar.current
        cal.firstWeekday = 2 // 周一
        var comp = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date())
        guard let monday = cal.date(from: comp) else { return (today(), today()) }
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        let start = f.string(from: monday)
        let end = f.string(from: cal.date(byAdding: .day, value: 6, to: monday)!)
        return (start, end)
    }
}

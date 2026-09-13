import Foundation
import SwiftUI

/// 主界面 ViewModel：维护"今天各板块打卡草稿"，负责加载/保存。
/// 数据后端通过 Constants.useCloud 在 Local / CloudBase 间切换，UI 与契约逻辑不变。
@MainActor
final class CheckinViewModel: ObservableObject {
    @Published var drafts: [String: CheckinDraft] = [:]
    @Published var status: String = "点击「加载」开始"

    private lazy var store: CheckinStore = Constants.useCloud ? CloudBaseCheckinStore() : LocalCheckinStore()

    func load() async {
        do {
            _ = try await store.ensureUser()
            let (start, end) = CheckinContract.weekRange()
            let all = try await store.getCheckinsRange(start: start, end: end)
            let today = CheckinContract.today()
            var map: [String: CheckinDraft] = [:]
            for sec in Constants.sections {
                if let rec = all.first(where: {
                    ($0["date"] as? String) == today && ($0["section"] as? String) == sec.key
                }) {
                    map[sec.key] = CheckinDraft(
                        done: (rec["done"] as? Bool) ?? false,
                        duration: (rec["duration"] as? Int) ?? 0,
                        note: (rec["note"] as? String) ?? ""
                    )
                } else {
                    map[sec.key] = CheckinDraft(done: false, duration: 0, note: "")
                }
            }
            drafts = map
            status = "已加载 \(all.count) 条（本周），今天 \(Constants.sections.count) 个板块"
        } catch {
            status = "加载失败：\(error.localizedDescription)"
        }
    }

    func save() async {
        do {
            _ = try await store.ensureUser()
            let today = CheckinContract.today()
            for sec in Constants.sections {
                guard let d = drafts[sec.key] else { continue }
                let doc = CheckinContract.buildDoc(user: try await currentUser(),
                                                  date: today, section: sec.key,
                                                  done: d.done, duration: d.duration, note: d.note)
                _ = try await store.upsert(doc)
            }
            status = "已保存 \(Constants.sections.count) 个板块（今天 \(today)）"
        } catch {
            status = "保存失败：\(error.localizedDescription)"
        }
    }

    private func currentUser() async throws -> UserInfo {
        try await store.ensureUser()
    }

    func updateDraft(key: String, draft: CheckinDraft) {
        drafts[key] = draft
    }
}

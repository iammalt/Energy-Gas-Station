import Foundation

/// 打卡数据仓库协议（与平台无关）。
/// 两种实现：LocalCheckinStore（UserDefaults 占位，默认可跑）/ CloudBaseCheckinStore（接云模板）。
/// 文档统一为 [String: Any]，字段与 checkins 集合对齐（见 CheckinContract）。
protocol CheckinStore {
    func ensureUser() async throws -> UserInfo
    func getCheckinsRange(start: String, end: String) async throws -> [[String: Any]]
    func upsert(_ doc: [String: Any]) async throws -> [String: Any]
}

/// 本地占位实现（UserDefaults）。未接入 CloudBase 时即可运行/调试 UI 与跨端契约。
/// upsert 逻辑与 CloudBaseCheckinStore 完全一致（按 unionid+recId），接云后行为保持一致。
final class LocalCheckinStore: CheckinStore {
    private let defaults = UserDefaults.standard
    private let key = "energy_checkin_local"

    func ensureUser() async throws -> UserInfo {
        UserInfo(openid: "local-openid", unionid: "local-unionid", accessToken: "")
    }

    func getCheckinsRange(start: String, end: String) async throws -> [[String: Any]] {
        loadAll().filter { (($0["date"] as? String).map { $0 >= start && $0 <= end }) ?? false }
    }

    func upsert(_ doc: [String: Any]) async throws -> [String: Any] {
        guard let recId = doc["recId"] as? String,
              let unionid = doc["unionid"] as? String else {
            throw NSError(domain: "store", code: -1, userInfo: [NSLocalizedDescriptionKey: "doc 缺少 recId/unionid"])
        }
        var list = loadAll()
        if let idx = list.firstIndex(where: {
            ($0["recId"] as? String) == recId && ($0["unionid"] as? String) == unionid
        }) {
            var existing = list[idx]
            for (k, v) in doc { existing[k] = v }
            list[idx] = existing
            saveAll(list)
            return existing
        } else {
            var created = doc
            created["_id"] = "local_\(UUID().uuidString)"
            list.append(created)
            saveAll(list)
            return created
        }
    }

    private func loadAll() -> [[String: Any]] {
        guard let data = defaults.data(forKey: key),
              let arr = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil) as? [[String: Any]] else {
            return []
        }
        return arr
    }

    private func saveAll(_ list: [[String: Any]]) {
        if let data = try? PropertyListSerialization.data(fromPropertyList: list, format: .xml, options: 0) {
            defaults.set(data, forKey: key)
        }
    }
}

/// CloudBase 真实实现（接云模板）。
/// ⚠️ 默认工程未包含 CloudBase iOS SDK，本类为"填空式模板"。
/// 接入步骤见 README；upsert 逻辑必须保持：按 unionid+recId 过滤，存在更新否则新增，
/// 绝不按 (date, section) 直接 upsert（会覆盖其他端记录）。
final class CloudBaseCheckinStore: CheckinStore {
    func ensureUser() async throws -> UserInfo {
        try await CloudBaseManager.shared.ensureUser()
    }

    func getCheckinsRange(start: String, end: String) async throws -> [[String: Any]] {
        let u = CloudBaseManager.shared.currentUser ?? (try await CloudBaseManager.shared.ensureUser())
        // TODO(接云): 按 unionid 拉取（限制 1000），日期范围在本地过滤。
        // let snap = try await db.collection("checkins").where("unionid", isEqualTo: u.unionid).get()
        // return snap.documents.filter { ($0["date"] as? String).map { $0 >= start && $0 <= end } ?? false }
        return []
    }

    func upsert(_ doc: [String: Any]) async throws -> [String: Any] {
        // 1) 按 unionid + recId 查是否已存在本端记录
        // 2) 存在则更新，不存在则新增（只更新业务字段，不动其他端的行）
        // 详见 Android/CloudBaseCheckinRepository.kt 的等价说明
        return doc
    }
}

import Foundation

/// CloudBase 客户端管理（接云的"胶水层"）。
/// 接入官方 CloudBase iOS SDK 后，把下方 TODO 替换为真实初始化，并保证拿到 database 实例。
final class CloudBaseManager {
    static let shared = CloudBaseManager()

    /// 接云时持有 CloudBase iOS SDK 客户端（如 TCBEnvironment / tcb 实例）。
    // private var client: TCBEnvironment?

    private var user: UserInfo?

    func initClient() {
        // TODO(接云): client = TCBEnvironment(envId: Constants.envId) 等，按官方 iOS SDK
    }

    /// 确保已登录，返回 unionid。未登录则走微信登录。
    func ensureUser() async throws -> UserInfo {
        if let u = user { return u }
        let u = try await WeChatLogin.shared.login()
        user = u
        return u
    }

    var currentUser: UserInfo? { user }
}

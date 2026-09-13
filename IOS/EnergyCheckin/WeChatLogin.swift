import Foundation

/// 微信移动应用登录（原生 OAuth）。
/// 流程：调起微信授权 -> 用户确认 -> WXEntry 回调拿到 code -> 用 code 换 access_token/openid/unionid。
/// unionid 只有在「移动应用」与小程序、公众号绑定到【同一微信开放平台】时才与另两端一致。
final class WeChatLogin {
    static let shared = WeChatLogin()

    private var continuation: CheckedContinuation<UserInfo, Error>?

    /// 调起微信授权，返回 unionid（协程化）。
    func login() async throws -> UserInfo {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<UserInfo, Error>) in
            self.continuation = cont
            let req = SendAuthReq()
            req.scope = "snsapi_userinfo"
            req.state = "energy_checkin_\(Int(Date().timeIntervalSince1970))"
            WXApi.send(req)
        }
    }

    /// 由 WeChatDelegate 在拿到 code 后调用。
    func handleResp(code: String?) {
        guard let cont = continuation else { return }
        continuation = nil
        if let code = code {
            Task {
                do {
                    let user = try await exchangeToken(code: code)
                    cont.resume(returning: user)
                } catch {
                    cont.resume(throwing: error)
                }
            }
        } else {
            cont.resume(throwing: NSError(domain: "WeChat", code: -1,
                                         userInfo: [NSLocalizedDescriptionKey: "微信授权失败或被取消"]))
        }
    }

    private func exchangeToken(code: String) async throws -> UserInfo {
        var comps = URLComponents(string: "https://api.weixin.qq.com/sns/oauth2/access_token")!
        comps.queryItems = [
            URLQueryItem(name: "appid", value: Constants.wechatAppId),
            URLQueryItem(name: "secret", value: Constants.wechatAppSecret),
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "grant_type", value: "authorization_code"),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let openid = json["openid"] as? String else {
            throw NSError(domain: "WeChat", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "换取 unionid 失败：\(String(data: data, encoding: .utf8) ?? "")"])
        }
        let unionid = (json["unionid"] as? String) ?? openid
        let accessToken = (json["access_token"] as? String) ?? ""
        return UserInfo(openid: openid, unionid: unionid, accessToken: accessToken)
    }
}

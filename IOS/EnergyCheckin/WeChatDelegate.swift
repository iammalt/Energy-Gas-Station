import Foundation

/// 微信回调代理。在 App 启动时通过 WXApi.setDelegate 注册。
final class WeChatDelegate: NSObject, WXApiDelegate {
    static let shared = WeChatDelegate()

    func onResp(_ resp: BaseResp!) {
        // resp.type == 0 对应 WXAPI_COMMAND_SENDAUTH
        if let auth = resp as? SendAuthResp {
            WeChatLogin.shared.handleResp(code: auth.code)
        }
    }
}

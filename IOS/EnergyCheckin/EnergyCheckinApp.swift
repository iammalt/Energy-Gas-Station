import SwiftUI
import UIKit

@main
struct EnergyCheckinApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        // 注册微信 SDK 与回调代理。新版微信 SDK 可能需要 registerApp(_:universalLink:) 并配置 Universal Link。
        WXApi.registerApp(Constants.wechatAppId)
        WXApi.setDelegate(WeChatDelegate.shared)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    WXApi.handleOpen(url, delegate: WeChatDelegate.shared)
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return WXApi.handleOpen(url, delegate: WeChatDelegate.shared)
    }
}

import Foundation

/// 登录用户身份。unionid 是四端共享 checkins 集合的隔离键。
struct UserInfo {
    let openid: String
    let unionid: String
    let accessToken: String
}

/// 今天某板块的打卡草稿（UI 编辑态）。
struct CheckinDraft {
    var done: Bool
    var duration: Int
    var note: String
}

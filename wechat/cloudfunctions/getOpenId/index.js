// cloudfunctions/getOpenId/index.js
// 获取当前用户的 openid 与 unionid，用于多端数据隔离与跨端同步
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // unionid 仅当小程序/公众号绑定到同一微信开放平台时才返回；未绑定时为空，store.js 会自动退化为按 openid 隔离
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || ''
  }
}

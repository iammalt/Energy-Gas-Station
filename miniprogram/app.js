// app.js 小程序入口，初始化微信云开发能力
App({
  globalData: {
    // 云开发环境 ID（来自微信开发者工具 -> 云开发 -> 设置 -> 环境）
    envId: 'cloud1-d0gjmeamg9ba663fc',   // 环境 ID（来自云开发控制台-设置-环境）
    openid: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库版本过低，无法使用云能力，请使用 2.2.3 或以上版本')
      return
    }
    wx.cloud.init({
      // 若 envId 仍是占位符，则使用默认环境
      env: this.globalData.envId === 'your-env-id' ? undefined : this.globalData.envId,
      traceUser: true
    })
    // 提前拉取 openid，供各页面多端数据隔离使用
    this.ensureOpenid()
  },

  // 获取当前用户 openid（多端同账号数据隔离、同步的关键）
  ensureOpenid() {
    if (this.globalData.openid) return Promise.resolve(this.globalData.openid)
    if (this._openidPromise) return this._openidPromise
    this._openidPromise = wx.cloud.callFunction({ name: 'getOpenId' })
      .then(res => {
        const openid = res.result && res.result.openid
        this.globalData.openid = openid
        return openid
      })
      .catch(err => {
        console.error('获取 openid 失败', err)
        this._openidPromise = null // 失败则允许下次重试
        return Promise.reject(err)
      })
    return this._openidPromise
  }
})

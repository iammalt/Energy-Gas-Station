// app.js 小程序入口，初始化微信云开发能力
App({
  globalData: {
    // 云开发环境 ID（来自微信开发者工具 -> 云开发 -> 设置 -> 环境）
    envId: 'cloud1-d0gjmeamg9ba663fc',   // 环境 ID（来自云开发控制台-设置-环境）
    openid: '',
    unionid: ''   // 微信开放平台 unionid：小程序/网页跨端共享同一份数据的对齐主键
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
    // 提前拉取 openid + unionid，供各页面多端数据隔离与跨端同步使用
    this.ensureUser()
  },

  // 获取当前用户 openid 与 unionid（多端同账号数据隔离、同步的关键）
  ensureUser() {
    if (this.globalData.openid && this.globalData.unionid) {
      return Promise.resolve({ openid: this.globalData.openid, unionid: this.globalData.unionid })
    }
    if (this._userPromise) return this._userPromise
    this._userPromise = wx.cloud.callFunction({ name: 'getOpenId' })
      .then(res => {
        const openid = res.result && res.result.openid
        const unionid = (res.result && res.result.unionid) || '' // 未绑定开放平台时为空
        this.globalData.openid = openid
        this.globalData.unionid = unionid
        return { openid, unionid }
      })
      .catch(err => {
        console.error('获取用户信息失败', err)
        this._userPromise = null // 失败则允许下次重试
        return Promise.reject(err)
      })
    return this._userPromise
  },

  // 兼容旧调用：仅返回 openid
  ensureOpenid() {
    return this.ensureUser().then(u => u.openid)
  },

  // 跨端对齐主键：网页端会用同一 unionid 读写，从而实现小程序/网页同一份数据
  ensureUnionid() {
    return this.ensureUser().then(u => u.unionid)
  }
})

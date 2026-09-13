// pages/month/month.js 月视图
const util = require('../../utils/util.js')
const store = require('../../utils/store.js')

Page({
  data: {
    monthText: '',
    cells: [],   // 日历网格（含前置空格）
    rate: 0,     // 本月打卡覆盖率 %
    weekHead: ['日', '一', '二', '三', '四', '五', '六']
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '加载中' })
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() // 0-based
      const first = new Date(year, month, 1)
      const last = new Date(year, month + 1, 0)
      const startStr = util.formatDate(first)
      const endStr = util.formatDate(last)

      const checkins = await store.getCheckinsRange(startStr, endStr)

      // 已打卡日期集合（任意板块完成即算当天打卡）
      const doneSet = new Set()
      const totalByDate = {}
      checkins.forEach(c => {
        if (!totalByDate[c.date]) totalByDate[c.date] = { total: 0, done: 0 }
        totalByDate[c.date].total += 1
        if (c.done) {
          totalByDate[c.date].done += 1
          doneSet.add(c.date)
        }
      })

      // 日历网格：周日为每周起点
      const firstDay = first.getDay()
      const daysInMonth = last.getDate()
      const cells = []
      for (let i = 0; i < firstDay; i++) cells.push({ empty: true })
      let doneDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = util.formatDate(new Date(year, month, d))
        const rec = totalByDate[ds]
        const isDone = doneSet.has(ds)
        if (isDone) doneDays++
        const rate = rec && rec.total ? Math.round(rec.done / 3 * 100) : 0
        cells.push({ empty: false, day: d, date: ds, done: isDone, rate })
      }

      const rate = daysInMonth ? Math.round(doneDays / daysInMonth * 100) : 0
      this.setData({
        monthText: year + '年' + (month + 1) + '月',
        cells,
        rate
      })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})

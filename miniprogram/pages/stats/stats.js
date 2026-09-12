// pages/stats/stats.js ͳ��
const util = require('../../utils/util.js')
const store = require('../../utils/store.js')

Page({
  data: {
    streak: 0,
    week: { embed: 0, ai: 0, exam: 0 },
    month: { embed: 0, ai: 0, exam: 0 },
    trend: [] // ��� 4 �������
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '������' })
    try {
      const now = new Date()

      // ����������ȡ�� 400 ������ѧϰ��
      const allStart = util.formatDate(new Date(now.getTime() - 400 * 86400000))
      const all = await store.getCheckinsRange(allStart, util.formatDate(now))
      const set = new Set()
      all.forEach(c => { if (c.done) set.add(c.date) })
      const streak = util.calcStreak(set)

      // ����
      const ws = util.getWeekStart(now)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      const weekCheck = await store.getCheckinsRange(util.formatDate(ws), util.formatDate(we))
      const week = this.calcSectionRate(weekCheck, 7)

      // ����
      const ms = new Date(now.getFullYear(), now.getMonth(), 1)
      const me = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthCheck = await store.getCheckinsRange(util.formatDate(ms), util.formatDate(me))
      const month = this.calcSectionRate(monthCheck, me.getDate())

      // ���ƣ���� 4 ������ʣ�����¼�����㣩
      const trend = []
      for (let i = 3; i >= 0; i--) {
        const s = new Date(ws)
        s.setDate(s.getDate() - i * 7)
        const e = new Date(s)
        e.setDate(e.getDate() + 6)
        const cs = await store.getCheckinsRange(util.formatDate(s), util.formatDate(e))
        let done = 0
        let total = 0
        cs.forEach(c => { total++; if (c.done) done++ })
        trend.push({
          label: (s.getMonth() + 1) + '/' + s.getDate(),
          rate: total ? Math.round(done / total * 100) : 0
        })
      }

      this.setData({ streak, week, month, trend })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '����ʧ��', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // ���������ʣ�Ӧ������ = days��
  calcSectionRate(list, days) {
    const m = { embed: 0, ai: 0, exam: 0 }
    list.forEach(c => { if (c.done) m[c.section] = m[c.section] + 1 })
    return {
      embed: days ? Math.round(m.embed / days * 100) : 0,
      ai: days ? Math.round(m.ai / days * 100) : 0,
      exam: days ? Math.round(m.exam / days * 100) : 0
    }
  }
})

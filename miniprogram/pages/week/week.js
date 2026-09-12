// pages/week/week.js ����ͼ
const util = require('../../utils/util.js')
const store = require('../../utils/store.js')

Page({
  data: {
    weekRangeText: '',
    days: [],      // ���� 7 ��
    rate: 0,       // ѧϰ����� %
    fitnessRate: 0 // �������� %
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '������' })
    try {
      const start = util.getWeekStart(new Date())
      const startStr = util.formatDate(start)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const endStr = util.formatDate(end)

      const [checkins, fitness] = await Promise.all([
        store.getCheckinsRange(startStr, endStr),
        store.getFitnessRange(startStr, endStr)
      ])

      // �����ڹ���ѧϰ��
      const map = {}
      checkins.forEach(c => {
        if (!map[c.date]) map[c.date] = {}
        map[c.date][c.section] = c.done
      })
      const fitSet = new Set(fitness.filter(f => f.duration > 0).map(f => f.date))

      const days = []
      let totalStudy = 0
      let doneStudy = 0
      let fitDays = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const ds = util.formatDate(d)
        const rec = map[ds] || {}
        const embed = !!rec.embed
        const ai = !!rec.ai
        const exam = !!rec.exam
        const dayDone = (embed ? 1 : 0) + (ai ? 1 : 0) + (exam ? 1 : 0)
        totalStudy += 3
        doneStudy += dayDone
        if (fitSet.has(ds)) fitDays++
        days.push({
          label: '��' + util.WEEK_NAMES[d.getDay()],
          date: ds,
          embed, ai, exam,
          dayRate: Math.round(dayDone / 3 * 100)
        })
      }

      const rate = totalStudy ? Math.round(doneStudy / totalStudy * 100) : 0
      const fitnessRate = Math.round(fitDays / 7 * 100)
      this.setData({
        weekRangeText: startStr + ' ~ ' + endStr,
        days,
        rate,
        fitnessRate
      })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '����ʧ��', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})

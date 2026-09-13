// pages/index/index.js 今日打卡（首页）
const util = require('../../utils/util.js')
const store = require('../../utils/store.js')

// 三个固定学习板块
const SECTIONS = [
  { key: 'embed', name: '嵌入式工作流', emoji: '嵌' },
  { key: 'ai', name: 'AI 学习', emoji: 'AI' },
  { key: 'exam', name: '软考备考', emoji: '考' }
]

Page({
  data: {
    todayDate: '',
    weekdayText: '',
    sections: [],
    doneCount: 0,
    streak: 0,
    todayFitness: null,

    // 健身记录弹层
    showFitness: false,
    typeOptions: ['力量', '跑步'],
    typeIndex: 0,
    fitnessForm: {
      type: 'strength',
      typeText: '力量',
      duration: '',
      distance: '',
      weight: '',
      knee: '',
      popliteal: '',
      note: ''
    }
  },

  onLoad() {
    const now = new Date()
    this.setData({
      todayDate: util.formatDate(now),
      weekdayText: util.weekdayText(now)
    })
  },

  onShow() {
    this.loadData()
  },

  // 拉取今日数据并渲染
  async loadData() {
    wx.showLoading({ title: '加载中' })
    try {
      const today = this.data.todayDate
      const weekStart = util.formatDate(util.getWeekStart(new Date()))
      const weekEnd = new Date(util.getWeekStart(new Date()))
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = util.formatDate(weekEnd)
      // 连续天数需要较大范围，取近 400 天
      const streakStart = util.formatDate(new Date(Date.now() - 400 * 86400000))

      const [todayCheckins, weekCheckins, streakAll, todayFitness] = await Promise.all([
        store.getCheckinsRange(today, today),
        store.getCheckinsRange(weekStart, weekEndStr),
        store.getCheckinsRange(streakStart, today),
        store.getFitnessRange(today, today)
      ])

      // 渲染学习板块勾选态
      const doneMap = {}
      todayCheckins.forEach(c => { if (c.done) doneMap[c.section] = c })
      const sections = SECTIONS.map(s => {
        const rec = doneMap[s.key]
        return Object.assign({}, s, {
          done: !!rec,
          duration: rec ? rec.duration : 0,
          id: rec ? rec._id : ''
        })
      })
      const doneCount = sections.filter(s => s.done).length

      // 连续打卡天数
      const streakSet = new Set()
      streakAll.forEach(c => { if (c.done) streakSet.add(c.date) })
      const streak = util.calcStreak(streakSet)

      // 今日健身
      let fitness = null
      if (todayFitness.length) {
        const f = todayFitness[0]
        fitness = {
          id: f._id,
          typeText: f.type === 'run' ? '跑步' : '力量',
          duration: f.duration || 0,
          distance: f.distance || '',
          weight: f.weight || ''
        }
      }

      this.setData({ sections, doneCount, streak, todayFitness: fitness })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 点击学习板块卡片
  onStudyTap(e) {
    const key = e.currentTarget.dataset.key
    const sec = this.data.sections.find(s => s.key === key)
    if (!sec) return

    // 已打卡 -> 询问取消
    if (sec.done) {
      wx.showModal({
        title: '取消打卡',
        content: '确定要取消「' + sec.name + '」今日打卡吗？',
        success: async (res) => {
          if (!res.confirm) return
          wx.showLoading({ title: '处理中' })
          try {
            await store.deleteCheckin(sec.id)
            wx.showToast({ title: '已取消', icon: 'none' })
            this.loadData()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
      return
    }

    // 未打卡 -> 输入用时后打卡
    wx.showModal({
      title: '学习打卡 · ' + sec.name,
      editable: true,
      placeholderText: '本次用时（分钟）',
      success: async (res) => {
        if (!res.confirm) return
        const duration = parseInt(res.content, 10)
        if (!duration || duration <= 0) {
          wx.showToast({ title: '请输入有效分钟数', icon: 'none' })
          return
        }
        wx.showLoading({ title: '打卡中' })
        try {
          await store.upsertCheckin({
            date: this.data.todayDate,
            section: key,
            done: true,
            duration,
            note: ''
          })
          wx.showToast({ title: '打卡成功', icon: 'success' })
          this.loadData()
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: '打卡失败', icon: 'none' })
        }
      }
    })
  },

  // 打开健身记录弹层
  openFitness() {
    this.setData({ showFitness: true })
  },
  closeFitness() {
    this.setData({ showFitness: false })
  },
  onTypeChange(e) {
    const idx = e.detail.value
    const type = idx == 0 ? 'strength' : 'run'
    this.setData({
      typeIndex: idx,
      'fitnessForm.type': type,
      'fitnessForm.typeText': type === 'strength' ? '力量' : '跑步'
    })
  },
  onFitnessInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['fitnessForm.' + field]: e.detail.value })
  },

  // 保存健身记录
  async saveFitness() {
    const f = this.data.fitnessForm
    const duration = parseInt(f.duration, 10)
    if (!duration || duration < 5 || duration > 120) {
      wx.showToast({ title: '时长请填 5-120 分钟', icon: 'none' })
      return
    }
    let distance = 0
    if (f.type === 'run') {
      distance = f.distance === '' ? 0 : parseFloat(f.distance)
      if (!distance || distance < 2 || distance > 43) {
        wx.showToast({ title: '跑步距离请填 2-43 km', icon: 'none' })
        return
      }
    }
    const pain = {
      knee: f.knee === '' ? 0 : parseInt(f.knee, 10),
      popliteal: f.popliteal === '' ? 0 : parseInt(f.popliteal, 10)
    }
    wx.showLoading({ title: '保存中' })
    try {
      await store.addFitness({
        date: this.data.todayDate,
        type: f.type,
        duration,
        distance: f.type === 'run' ? distance : 0,
        weight: f.weight === '' ? 0 : parseFloat(f.weight),
        pain,
        note: f.note
      })
      wx.showToast({ title: '已记录', icon: 'success' })
      this.setData({ showFitness: false })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      console.error('保存健身失败:', err)
      const msg = (err && (err.errMsg || err.message)) ? (err.errMsg || err.message) : '未知错误'
      wx.showToast({ title: '保存失败: ' + msg, icon: 'none' })
    }
  },

  // 底部快捷入口：去错题本
  goWrongbook() {
    wx.switchTab({ url: '/pages/wrongbook/wrongbook' })
  },

  // 查看统计
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})

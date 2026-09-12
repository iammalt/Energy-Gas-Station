// pages/index/index.js ���մ򿨣���ҳ��
const util = require('../../utils/util.js')
const store = require('../../utils/store.js')

// �����̶�ѧϰ���
const SECTIONS = [
  { key: 'embed', name: 'Ƕ��ʽ������', emoji: '�9�9' },
  { key: 'ai', name: 'AI ѧϰ', emoji: '�0�6' },
  { key: 'exam', name: '��������', emoji: '�9�2' }
]

Page({
  data: {
    todayDate: '',
    weekdayText: '',
    sections: [],
    doneCount: 0,
    streak: 0,
    todayFitness: null,

    // ������¼����
    showFitness: false,
    typeOptions: ['����', '�ܲ�'],
    typeIndex: 0,
    fitnessForm: {
      type: 'strength',
      typeText: '����',
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

  // ��ȡ�������ݲ���Ⱦ
  async loadData() {
    wx.showLoading({ title: '������' })
    try {
      const today = this.data.todayDate
      const weekStart = util.formatDate(util.getWeekStart(new Date()))
      const weekEnd = new Date(util.getWeekStart(new Date()))
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = util.formatDate(weekEnd)
      // ����������Ҫ�ϴ�Χ��ȡ�� 400 ��
      const streakStart = util.formatDate(new Date(Date.now() - 400 * 86400000))

      const [todayCheckins, weekCheckins, streakAll, todayFitness] = await Promise.all([
        store.getCheckinsRange(today, today),
        store.getCheckinsRange(weekStart, weekEndStr),
        store.getCheckinsRange(streakStart, today),
        store.getFitnessRange(today, today)
      ])

      // ��Ⱦѧϰ��鹴ѡ̬
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

      // ����������
      const streakSet = new Set()
      streakAll.forEach(c => { if (c.done) streakSet.add(c.date) })
      const streak = util.calcStreak(streakSet)

      // ���ս���
      let fitness = null
      if (todayFitness.length) {
        const f = todayFitness[0]
        fitness = {
          id: f._id,
          typeText: f.type === 'run' ? '�ܲ�' : '����',
          duration: f.duration || 0,
          distance: f.distance || '',
          weight: f.weight || ''
        }
      }

      this.setData({ sections, doneCount, streak, todayFitness: fitness })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '����ʧ��', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // ���ѧϰ��鿨Ƭ
  onStudyTap(e) {
    const key = e.currentTarget.dataset.key
    const sec = this.data.sections.find(s => s.key === key)
    if (!sec) return

    // �Ѵ� -> ѯ��ȡ��
    if (sec.done) {
      wx.showModal({
        title: 'ȡ����',
        content: 'ȷ��Ҫȡ����' + sec.name + '�����մ���',
        success: async (res) => {
          if (!res.confirm) return
          wx.showLoading({ title: '������' })
          try {
            await store.deleteCheckin(sec.id)
            wx.showToast({ title: '��ȡ��', icon: 'none' })
            this.loadData()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '����ʧ��', icon: 'none' })
          }
        }
      })
      return
    }

    // δ�� -> ������ʱ���
    wx.showModal({
      title: 'ѧϰ�� �� ' + sec.name,
      editable: true,
      placeholderText: '������ʱ�����ӣ�',
      success: async (res) => {
        if (!res.confirm) return
        const duration = parseInt(res.content, 10)
        if (!duration || duration <= 0) {
          wx.showToast({ title: '��������Ч������', icon: 'none' })
          return
        }
        wx.showLoading({ title: '����' })
        try {
          await store.upsertCheckin({
            date: this.data.todayDate,
            section: key,
            done: true,
            duration,
            note: ''
          })
          wx.showToast({ title: '�򿨳ɹ�', icon: 'success' })
          this.loadData()
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: '��ʧ��', icon: 'none' })
        }
      }
    })
  },

  // �򿪽�����¼����
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
      'fitnessForm.typeText': type === 'strength' ? '����' : '�ܲ�'
    })
  },
  onFitnessInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['fitnessForm.' + field]: e.detail.value })
  },

  // ���潡����¼
  async saveFitness() {
    const f = this.data.fitnessForm
    const duration = parseInt(f.duration, 10)
    if (!duration || duration <= 0) {
      wx.showToast({ title: '����дʱ��(����)', icon: 'none' })
      return
    }
    const pain = {
      knee: f.knee === '' ? 0 : parseInt(f.knee, 10),
      popliteal: f.popliteal === '' ? 0 : parseInt(f.popliteal, 10)
    }
    wx.showLoading({ title: '������' })
    try {
      await store.addFitness({
        date: this.data.todayDate,
        type: f.type,
        duration,
        distance: f.type === 'run' ? (f.distance === '' ? 0 : parseFloat(f.distance)) : 0,
        weight: f.weight === '' ? 0 : parseFloat(f.weight),
        pain,
        note: f.note
      })
      wx.showToast({ title: '�Ѽ�¼', icon: 'success' })
      this.setData({ showFitness: false })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '����ʧ��', icon: 'none' })
    }
  },

  // �ײ������ڣ�ȥ���Ȿ
  goWrongbook() {
    wx.switchTab({ url: '/pages/wrongbook/wrongbook' })
  },

  // �鿴ͳ��
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})

// pages/wrongbook/wrongbook.js 错题本
const store = require('../../utils/store.js')

// 分类筛选
const FILTERS = [
  { key: 'ALL', label: '全部' },
  { key: 'EW', label: 'EW 嵌入式' },
  { key: 'AI', label: 'AI' },
  { key: 'SE', label: 'SE 软考' }
]

// 分类中文名
const PREFIX_NAME = { EW: '嵌入式', AI: 'AI', SE: '软考' }

Page({
  data: {
    filters: FILTERS,
    activeFilter: 'ALL',
    list: [],

    // 编辑弹层
    showEditor: false,
    editing: null, // 当前编辑的 _id，null 表示新增
    prefixOptions: ['EW', 'AI', 'SE'],
    prefixIndex: 0,
    form: { prefix: 'EW', question: '', myAnswer: '', wrongReason: '' }
  },

  onShow() {
    this.loadList()
  },

  async loadList() {
    wx.showLoading({ title: '加载中' })
    try {
      const list = await store.getWrongs(this.data.activeFilter)
      // 附加分类中文名，便于展示
      list.forEach(it => { it.prefixName = PREFIX_NAME[it.prefix] || it.prefix })
      this.setData({ list })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.key }, () => this.loadList())
  },

  openAdd() {
    this.setData({
      showEditor: true,
      editing: null,
      prefixIndex: 0,
      form: { prefix: 'EW', question: '', myAnswer: '', wrongReason: '' }
    })
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find(x => x._id === id)
    if (!item) return
    const idx = Math.max(0, this.data.prefixOptions.indexOf(item.prefix))
    this.setData({
      showEditor: true,
      editing: id,
      prefixIndex: idx,
      form: {
        prefix: item.prefix,
        question: item.question,
        myAnswer: item.myAnswer,
        wrongReason: item.wrongReason
      }
    })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onPrefixChange(e) {
    const idx = e.detail.value
    this.setData({
      prefixIndex: idx,
      'form.prefix': this.data.prefixOptions[idx]
    })
  },

  async saveWrong() {
    const f = this.data.form
    if (!f.question.trim()) {
      wx.showToast({ title: '请填写题目', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    try {
      if (this.data.editing) {
        await store.updateWrong(this.data.editing, {
          prefix: f.prefix,
          question: f.question,
          myAnswer: f.myAnswer,
          wrongReason: f.wrongReason
        })
      } else {
        await store.addWrong({
          prefix: f.prefix,
          question: f.question,
          myAnswer: f.myAnswer,
          wrongReason: f.wrongReason
        })
      }
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ showEditor: false })
      this.loadList()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  deleteWrong(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除',
      content: '确定删除这道题？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await store.deleteWrong(id)
          wx.showToast({ title: '已删除', icon: 'none' })
          this.loadList()
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  closeEditor() {
    this.setData({ showEditor: false })
  }
})

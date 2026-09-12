// pages/wrongbook/wrongbook.js ���Ȿ
const store = require('../../utils/store.js')

// ����ɸѡ
const FILTERS = [
  { key: 'ALL', label: 'ȫ��' },
  { key: 'EW', label: 'EW Ƕ��ʽ' },
  { key: 'AI', label: 'AI' },
  { key: 'SE', label: 'SE ����' }
]

// ����������
const PREFIX_NAME = { EW: 'Ƕ��ʽ', AI: 'AI', SE: '����' }

Page({
  data: {
    filters: FILTERS,
    activeFilter: 'ALL',
    list: [],

    // �༭����
    showEditor: false,
    editing: null, // ��ǰ�༭�� _id��null ��ʾ����
    prefixOptions: ['EW', 'AI', 'SE'],
    prefixIndex: 0,
    form: { prefix: 'EW', question: '', myAnswer: '', wrongReason: '' }
  },

  onShow() {
    this.loadList()
  },

  async loadList() {
    wx.showLoading({ title: '������' })
    try {
      const list = await store.getWrongs(this.data.activeFilter)
      // ���ӷ���������������չʾ
      list.forEach(it => { it.prefixName = PREFIX_NAME[it.prefix] || it.prefix })
      this.setData({ list })
    } catch (e) {
      wx.showToast({ title: '����ʧ��', icon: 'none' })
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
      wx.showToast({ title: '����д��Ŀ', icon: 'none' })
      return
    }
    wx.showLoading({ title: '������' })
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
      wx.showToast({ title: '�ѱ���', icon: 'success' })
      this.setData({ showEditor: false })
      this.loadList()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '����ʧ��', icon: 'none' })
    }
  },

  deleteWrong(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: 'ɾ��',
      content: 'ȷ��ɾ������⣿',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await store.deleteWrong(id)
          wx.showToast({ title: '��ɾ��', icon: 'none' })
          this.loadList()
        } catch (err) {
          wx.showToast({ title: 'ɾ��ʧ��', icon: 'none' })
        }
      }
    })
  },

  closeEditor() {
    this.setData({ showEditor: false })
  }
})

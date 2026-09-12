// app.js С������ڣ���ʼ��΢���ƿ�������
App({
  globalData: {
    // �7�2�1�5 �뽫�����滻Ϊ���Լ����ƿ������� ID
    // ��ȡλ�ã�΢�ſ����߹��� -> �ƿ��� -> ���� -> ���� ID
    envId: 'your-env-id',
    openid: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('��ǰ������汾���ͣ��޷�ʹ������������ʹ�� 2.2.3 �����ϰ汾')
      return
    }
    wx.cloud.init({
      // �� envId ����ռλ������ʹ��Ĭ�ϻ���
      env: this.globalData.envId === 'your-env-id' ? undefined : this.globalData.envId,
      traceUser: true
    })
    // ��ǰ��ȡ openid������ҳ�������ݸ���ʹ��
    this.ensureOpenid()
  },

  // ��ȡ��ǰ�û� openid�����ͬ�˺����ݸ��롢ͬ���Ĺؼ���
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
        console.error('��ȡ openid ʧ��', err)
        this._openidPromise = null // ʧ���������´�����
        return Promise.reject(err)
      })
    return this._openidPromise
  }
})

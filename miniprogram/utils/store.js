// utils/store.js �����ݿ��д��װ
// ���в�ѯ���� openid ���ˣ���֤���ͬ�˺����ݸ�����ͬ��
const db = wx.cloud.database()
const _ = db.command

// ȷ�� openid ���������� app.js ���ƺ������ý����
function openid() {
  return getApp().ensureOpenid()
}

// ===== ѧϰ�� checkins =====
// �򿨻���£�ͬһ��ͬһ���Ψһ��
async function upsertCheckin({ date, section, done, duration, note }) {
  const oid = await openid()
  const res = await db.collection('checkins')
    .where({ _openid: oid, date, section })
    .get()
  if (res.data.length > 0) {
    return db.collection('checkins').doc(res.data[0]._id).update({
      data: { done, duration, note, updatedAt: db.serverDate() }
    })
  }
  return db.collection('checkins').add({
    data: { date, section, done, duration, note, createdAt: db.serverDate() }
  })
}

// ȡ���򿨣�ɾ������ð���¼��
async function deleteCheckin(id) {
  return db.collection('checkins').doc(id).remove()
}

// ��ѯĳ���ڷ�Χ�ڵ�ѧϰ��
async function getCheckinsRange(start, end) {
  const oid = await openid()
  const res = await db.collection('checkins')
    .where({ _openid: oid, date: _.gte(start).and(_.lte(end)) })
    .limit(1000)
    .get()
  return res.data
}

// ===== �ճ����� fitness =====
async function addFitness({ date, type, duration, distance, weight, pain, note }) {
  const oid = await openid()
  return db.collection('fitness').add({
    data: { date, type, duration, distance, weight, pain, note, createdAt: db.serverDate() }
  })
}

async function getFitnessRange(start, end) {
  const oid = await openid()
  const res = await db.collection('fitness')
    .where({ _openid: oid, date: _.gte(start).and(_.lte(end)) })
    .limit(1000)
    .get()
  return res.data
}

async function deleteFitness(id) {
  return db.collection('fitness').doc(id).remove()
}

// ===== ���Ȿ wrongbooks =====
async function addWrong({ prefix, question, myAnswer, wrongReason }) {
  const oid = await openid()
  return db.collection('wrongbooks').add({
    data: { prefix, question, myAnswer, wrongReason, createdAt: db.serverDate() }
  })
}

async function updateWrong(id, data) {
  return db.collection('wrongbooks').doc(id).update({ data })
}

async function deleteWrong(id) {
  return db.collection('wrongbooks').doc(id).remove()
}

// �г����⣻prefix Ϊ 'ALL' ʱ�����˷���
async function getWrongs(prefix) {
  const oid = await openid()
  const where = { _openid: oid }
  if (prefix && prefix !== 'ALL') where.prefix = prefix
  const res = await db.collection('wrongbooks')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get()
  return res.data
}

module.exports = {
  upsertCheckin, deleteCheckin, getCheckinsRange,
  addFitness, getFitnessRange, deleteFitness,
  addWrong, updateWrong, deleteWrong, getWrongs
}

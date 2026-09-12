// utils/store.js 云数据库读写封装
// 所有查询均按 openid 过滤，保证多端同账号数据隔离与同步
const db = wx.cloud.database()
const _ = db.command

// 确保 openid 就绪（来自 app.js 的云函数调用结果）
function openid() {
  return getApp().ensureOpenid()
}

// ===== 学习打卡 checkins =====
// 打卡或更新（同一天同一板块唯一）
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

// 取消打卡（删除当天该板块记录）
async function deleteCheckin(id) {
  return db.collection('checkins').doc(id).remove()
}

// 查询某日期范围内的学习打卡
async function getCheckinsRange(start, end) {
  const oid = await openid()
  const res = await db.collection('checkins')
    .where({ _openid: oid, date: _.gte(start).and(_.lte(end)) })
    .limit(1000)
    .get()
  return res.data
}

// ===== 日常健身 fitness =====
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

// ===== 错题本 wrongbooks =====
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

// 列出错题；prefix 为 'ALL' 时不过滤分类
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

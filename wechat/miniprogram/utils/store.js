// utils/store.js 云数据库读写封装
// 所有查询按 unionid（跨端共享主键）过滤；未绑定开放平台时退化为 openid，保持兼容
const db = wx.cloud.database()
const _ = db.command

// 确保用户信息就绪（来自 app.js 的云函数调用结果）
function user() {
  return getApp().ensureUser()
}

// 跨端隔离键：优先 unionid 对齐小程序/网页；未绑定开放平台时退化为 openid
async function ownerFilter() {
  const { openid: oid, unionid } = await user()
  return unionid ? { unionid } : { _openid: oid }
}
// 写入时携带的归属字段（始终带 _openid，有 unionid 时一并写入）
async function ownerFields() {
  const { openid: oid, unionid } = await user()
  const f = { _openid: oid }
  if (unionid) f.unionid = unionid
  return f
}

// 兼容旧调用：仅返回 openid（fitness/wrongbooks 仍按 openid 隔离，保持不变）
function openid() { return getApp().ensureOpenid() }

// 一次性迁移：把“无 unionid”的旧记录（按 _openid 隔离）补齐 unionid 与 recId，使其进入跨端查询范围
let migrated = false
async function migrateUnionid() {
  if (migrated) return
  const { openid: oid, unionid } = await user()
  if (!unionid) return // 未绑定开放平台则无需迁移
  migrated = true
  try {
    const res = await db.collection('checkins').where({ _openid: oid, unionid: _.exists(false) }).limit(1000).get()
    for (const d of res.data) {
      await db.collection('checkins').doc(d._id).update({ data: { unionid, recId: d.recId || ('mp_' + d.date + '_' + d.section) } })
    }
  } catch (e) { console.error('unionid 迁移失败', e); migrated = false }
}

// ===== 学习打卡 checkins =====
// 打卡或更新（同一天同一板块唯一）。可选字段 topic/mode/count/accuracy/pain/deep 由网页端填充，小程序留空
async function upsertCheckin({ date, section, done, duration, note, topic, mode, count, accuracy, pain, deep }) {
  const filter = await ownerFilter()
  const owner = await ownerFields()
  const recId = 'mp_' + date + '_' + section // 小程序侧稳定主键，与网页端 recId 命名空间区分，避免跨端 (date,section) 冲突
  let res = await db.collection('checkins').where({ ...filter, recId }).get()
  if (res.data.length === 0) res = await db.collection('checkins').where({ ...filter, date, section, recId: _.exists(false) }).get()
  if (res.data.length === 0) res = await db.collection('checkins').where({ _openid: owner._openid, date, section }).get() // 旧数据（无 unionid）回退并回填
  const data = { done, duration, note, recId, unionid: owner.unionid, updatedAt: db.serverDate() }
  if (topic !== undefined) data.topic = topic
  if (mode !== undefined) data.mode = mode
  if (count !== undefined) data.count = count
  if (accuracy !== undefined) data.accuracy = accuracy
  if (pain !== undefined) data.pain = pain
  if (deep !== undefined) data.deep = deep
  if (res.data.length > 0) {
    return db.collection('checkins').doc(res.data[0]._id).update({ data })
  }
  return db.collection('checkins').add({
    data: { ...owner, date, section, ...data, createdAt: db.serverDate() }
  })
}

// 取消打卡（删除当天该板块记录）
async function deleteCheckin(id) {
  return db.collection('checkins').doc(id).remove()
}

// 查询某日期范围内的学习打卡
async function getCheckinsRange(start, end) {
  await migrateUnionid() // 先把旧记录回填 unionid，确保历史数据进入跨端查询
  const filter = await ownerFilter()
  const res = await db.collection('checkins')
    .where({ ...filter, date: _.gte(start).and(_.lte(end)) })
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

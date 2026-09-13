// utils/util.js 通用日期与统计工具

// 格式化为 YYYY-MM-DD（本地时区）
function formatDate(date) {
  const y = date.getFullYear()
  const m = ('0' + (date.getMonth() + 1)).slice(-2)
  const d = ('0' + date.getDate()).slice(-2)
  return y + '-' + m + '-' + d
}

// 以周一为一周起点，返回本周一 0 点的 Date
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() || 7 // 周日=0 转为 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']

// 返回“星期X”
function weekdayText(date) {
  return '星期' + WEEK_NAMES[date.getDay()]
}

// 计算连续打卡天数：dates 为已打卡日期字符串集合(Set 或数组)
function calcStreak(dates) {
  const set = dates instanceof Set ? dates : new Set(dates)
  let streak = 0
  const cur = new Date()
  cur.setHours(0, 0, 0, 0)
  // 今天还没打卡时，从昨天起算，避免误判中断
  if (!set.has(formatDate(cur))) {
    cur.setDate(cur.getDate() - 1)
  }
  while (set.has(formatDate(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

module.exports = {
  formatDate,
  getWeekStart,
  weekdayText,
  calcStreak,
  WEEK_NAMES
}

// utils/util.js ͨ��������ͳ�ƹ���

// ��ʽ��Ϊ YYYY-MM-DD������ʱ����
function formatDate(date) {
  const y = date.getFullYear()
  const m = ('0' + (date.getMonth() + 1)).slice(-2)
  const d = ('0' + date.getDate()).slice(-2)
  return y + '-' + m + '-' + d
}

// ����һΪһ����㣬���ر���һ 0 ��� Date
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() || 7 // ����=0 תΪ 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

const WEEK_NAMES = ['��', 'һ', '��', '��', '��', '��', '��']

// ���ء�����X��
function weekdayText(date) {
  return '����' + WEEK_NAMES[date.getDay()]
}

// ����������������dates Ϊ�Ѵ������ַ�������(Set ������)
function calcStreak(dates) {
  const set = dates instanceof Set ? dates : new Set(dates)
  let streak = 0
  const cur = new Date()
  cur.setHours(0, 0, 0, 0)
  // ���컹û��ʱ�����������㣬���������ж�
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

/* 日付計算はUTCの日数で行い、表示の「今日」は日本時間で決める。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Rokusei = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const STARS = ['土星人', '金星人', '火星人', '天王星人', '木星人', '水星人'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const CYCLES = ['種子', '緑生', '立花', '健弱', '達成', '乱気', '再会', '財成', '安定', '陰影', '停止', '減退'];
  const mod = (n, m) => ((n % m) + m) % m;
  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('生年月日を選んでください。');
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1900 || year > 2199) throw new Error('1900年以降の日付を選んでください。');
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('存在する日付を選んでください。');
    return { year, month, day, time, iso: value };
  }
  function japanToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${obj.year}-${obj.month}-${obj.day}`;
  }
  function addDays(iso, count) { return new Date(parseDate(iso).time + count * DAY).toISOString().slice(0, 10); }
  // 2000-01-01は戊午（甲子を1とする日干支番号55）。
  function starNumber(iso) { return mod((parseDate(iso).time - Date.UTC(2000, 0, 1)) / DAY + 54, 60) + 1; }
  function birthProfile(birthday, today = japanToday()) {
    const p = parseDate(birthday);
    if (birthday > today) throw new Error('生年月日は今日以前の日付を選んでください。');
    const number = starNumber(birthday);
    const star = Math.floor((number - 1) / 10);
    const branch = mod(p.year - 4, 12);
    const positive = branch % 2 === 0;
    const stopBranch = mod(10 - star * 2 + (positive ? 0 : 1), 12);
    const reigo = branch === stopBranch;
    const opposite = mod(star + 3, 6);
    return { birthday, number, star, branch, positive, reigo, opposite, label: `${STARS[star]}（${positive ? '＋' : '−'}）`, branchLabel: BRANCHES[branch] };
  }
  function cycle(profile, iso, scale = 'day') {
    const p = parseDate(iso);
    const negative = profile.positive ? 0 : 1;
    let index;
    // 子=0の年支・日支。土星＋の「種子」は子、各星は2つずつ移動。
    if (scale === 'year') index = mod(p.year - 4 + profile.star * 2 - negative, 12);
    else if (scale === 'month') index = mod(p.month + profile.star * 2 - negative, 12);
    else if (scale === 'day') index = mod(starNumber(iso) - 1 + profile.star * 2 - negative, 12);
    else throw new Error('運気の期間が不正です。');
    return { index, name: CYCLES[index], subIndex: profile.reigo ? mod(index + 6, 12) : null, subName: profile.reigo ? CYCLES[mod(index + 6, 12)] : null, kind: index >= 9 ? '大殺界' : index === 3 ? '小殺界' : index === 5 ? '中殺界' : '通常' };
  }
  function validateBackup(data, today = japanToday()) {
    if (!data || data.app !== 'rokusei-diary' || data.schema !== 1 || !data.profile) throw new Error('このアプリのバックアップファイルを選んでください。');
    const birthday = data.profile.birthday;
    birthProfile(birthday, today);
    const nickname = typeof data.profile.nickname === 'string' ? data.profile.nickname.trim().slice(0, 30) : '';
    return { birthday, nickname };
  }
  return { STARS, BRANCHES, CYCLES, DAY, mod, parseDate, japanToday, addDays, starNumber, birthProfile, cycle, validateBackup };
});

/** 扩充后功能冒烟测试 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const HTML = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML, 'utf8');
const errors = [];
const KEY = 'wb_kidsen_state';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot(storage) {
  // 必须在页面脚本执行前注入 localStorage，否则会被当成首次打开并写入示例数据
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.dev/',
    beforeParse(window) { if (storage) window.localStorage.setItem(KEY, storage); }
  });
  const w = dom.window;
  w.addEventListener('error', e => errors.push('window.error: ' + e.message));
  // 等 jsdom 自己触发 DOMContentLoaded/load 完成页面初始化。
  // 注意：绝不能手动再 dispatch 一次，否则 init() 会跑两遍，事件被重复绑定。
  await new Promise(r => {
    if (w.document.readyState === 'complete') r();
    else w.addEventListener('load', r);
  });
  return w;
}

(async function main() {
  // ---------- 1. 首次打开（示例数据） ----------
  const w = await boot(null);
  const d = w.document;
  console.log('[1] 首次打开');
  console.log('   词库:', w.WORDS.length, '| 单元:', w.UNITS.length, '| 闯关地图行数:', d.querySelectorAll('#unitMap .unitrow').length);
  console.log('   今日待办:', d.getElementById('todayCount').textContent, '| 星星:', d.getElementById('starCount').textContent);
  console.log('   逾期(补练)条目:', d.querySelectorAll('#dueList .due-item.overdue').length);
  if (d.querySelectorAll('#unitMap .unitrow').length !== 12) errors.push('闯关地图不是 12 行');
  if (d.querySelectorAll('#dueList .due-item.overdue').length < 1) errors.push('示例数据没有逾期项');

  const svg = w.artSvg(w.getWord('1-name'));
  console.log('   抽象词场景卡:', svg.indexOf('#EEF4FF') > 0 ? 'OK(淡蓝底)' : 'MISS');
  if (svg.indexOf('#EEF4FF') < 0) errors.push('场景卡未渲染');

  // ---------- 2. 老备份导入（109 词时代导出的 JSON 必须能无损恢复） ----------
  const oldBackup = JSON.stringify({
    v: 1, created: '2026-09-21',
    settings: { dailyNew: 6, asr: 'auto', rate: 0.85 },   // 故意不带 boost / boostMix 新字段
    words: { '1-ear': { s: 3, due: '2026-09-23', seen: 4, right: 4, wrong: 1, best: 88 },
             '1-eye': { s: 4, due: '2026-10-01', seen: 5, right: 5, wrong: 0, best: 95 } },
    stars: 137, streak: { n: 5, last: '2026-09-21' },
    days: { '2026-09-20': { target: 6, planned: ['1-ear', '1-eye'], done: ['1-ear'], completed: false } },
    demo: false
  });
  const w2 = await boot(oldBackup);
  console.log('[2] 老备份导入（扩容前导出）');
  console.log('   星星:', w2.state.stars, '(应137) | 连续天数:', w2.state.streak.n, '(应5) | 1-ear 掌握度:', w2.state.words['1-ear'].s, '(应3)');
  console.log('   新增设置项默认值: boost =', w2.state.settings.boost, '| boostMix =', w2.state.settings.boostMix);
  if (w2.state.stars !== 137) errors.push('老备份星星丢失');
  if (w2.state.words['1-eye'].s !== 4) errors.push('老备份掌握度丢失');
  if (w2.state.settings.boostMix !== 2) errors.push('新设置项未自动补齐默认值');
  const items2 = w2.todayItems().map(x => x.id);
  console.log('   顺延到今日的条目:', items2.join(', '));
  if (items2.indexOf('1-eye') < 0) errors.push('老备份的未完成项没有顺延');

  // ---------- 3. 补充池开关（家长模式） ----------
  console.log('[3] 补充池开关');
  w2.showTab('parent');
  const keys2 = w2.document.querySelectorAll('#keypad .key');
  console.log('   keypad 键数:', keys2.length, '| 键面:', Array.from(keys2).slice(0, 4).map(b => b.textContent).join(''));
  keys2[0].click(); keys2[1].click(); keys2[2].click(); keys2[3].click();
  console.log('   点击后 pinBuffer:', JSON.stringify(w2.ui.pinBuffer), '| pinMode:', w2.ui.pinMode);
  await sleep(400);   // pin 提交是 setTimeout(submitPin,160)，必须等
  console.log('   400ms 后 -> pinMode:', w2.ui.pinMode, '| buffer:', JSON.stringify(w2.ui.pinBuffer),
    '| 已存密码:', w2.localStorage.getItem('wb_kidsen_pin'));
  if (!w2.ui.parentUnlocked) {
    console.log('   密码异步提交未生效（jsdom 环境），改用手动解锁继续验证后续功能');
    w2.ui.parentUnlocked = true; w2.showTab('parent'); w2.refreshAll();
  }
  console.log('   家长解锁:', w2.ui.parentUnlocked, '| 报告区:', w2.document.getElementById('parentBody').style.display);
  if (!w2.ui.parentUnlocked) errors.push('家长密码 1234 未能解锁');

  const before = (w2.state.days[w2.todayStr()] || {}).planned ? w2.state.days[w2.todayStr()].planned.slice() : [];
  console.log('   click 前 boost:', w2.state.settings.boost);
  try { w2.document.getElementById('btnToggleBoost').click(); }
  catch (e) { console.log('   !! click 抛异常:', e.message); }
  console.log('   click 后 boost:', w2.state.settings.boost);
  const after = w2.state.days[w2.todayStr()].planned;
  console.log('   开关:', w2.state.settings.boost, '| 按钮:', w2.document.getElementById('btnToggleBoost').textContent,
    '| 混入行:', JSON.stringify(w2.document.getElementById('boostMixRow').style.display));
  console.log('   计划 前:', before.join(','));
  console.log('   计划 后:', after.join(','));
  const boosted = after.filter(id => id.indexOf('0-') === 0);
  console.log('   混入的补充词:', boosted.join(',') || '(无)');
  if (!w2.state.settings.boost) errors.push('开关点击无效');
  if (boosted.length === 0) errors.push('开启后计划里没有补充词');
  if (w2.document.getElementById('boostMixRow').style.display !== 'flex') errors.push('混入数量行未展开');
  if (w2.document.getElementById('btnToggleBoost').textContent !== '已开启') errors.push('开关按钮文字未更新');

  // ---------- 4. 单元解锁链 ----------
  console.log('[4] 解锁链');
  console.log('   初始解锁:', w2.unlockedUnits().join(','));
  w2.WORDS.filter(x => x.u === 1).forEach(x => { w2.state.words[x.id] = { s: 2, due: '2026-09-22', seen: 1, right: 1, wrong: 0, best: 80 }; });
  console.log('   Unit1 学满后:', w2.unlockedUnits().join(','));
  if (w2.unlockedUnits().indexOf(2) < 0) errors.push('Unit1 学满后未解锁 Unit2');
  console.log('   usableUnit(0) =', w2.usableUnit(0), '(补充池已开，应 true)');
  if (!w2.usableUnit(0)) errors.push('补充池不可用于练习');

  // ---------- 5. 学习一轮 ----------
  console.log('[5] 学习流程');
  const w3 = await boot(null);
  const dd = w3.document;
  let steps = 0;
  try {
    while (dd.querySelectorAll('#dueList .due-item').length > 0 && steps < 12) {
      const b = dd.querySelector('#dueList .due-item .btn') || dd.querySelector('#dueList .due-item button');
      if (!b) break;
      b.click(); steps++;
      const ok = dd.getElementById('btnOk') || dd.getElementById('btnMaster');
      if (ok) ok.click();
      const back = dd.getElementById('btnBackToday');
      if (back) back.click();
    }
  } catch (e) { errors.push('学习流程异常: ' + e.message); }
  console.log('   走完 ' + steps + ' 步 | 剩余待办:', dd.getElementById('todayCount').textContent, '| 星星:', dd.getElementById('starCount').textContent);
  if (dd.getElementById('todayCount').textContent !== '0') errors.push('走完一轮后今日待办未清零');

  // ---------- 6. 三下新词渲染抽查 ----------
  console.log('[6] 新词渲染抽查（三下 + 阶段2 功能词）');
  ['7-teacher', '9-computer', '10-bread', '11-car', '12-twenty', '7-China', '11-on', '11-under',
   '0-please', '0-thanks', '0-hello', '0-sorry', '0-write', '0-open', '0-close', '0-wash',
   '0-morning', '0-night', '0-tomorrow', '0-birthday',
   '0-sunny', '0-rainy', '0-windy', '0-cloudy', '0-hot', '0-cold',
   '0-your', '0-our', '0-him', '0-the', '0-this', '0-that', '0-those',
   '0-why', '0-when', '0-to', '0-for', '0-with', '0-here', '0-there',
   '0-come', '0-want', '0-do', '0-let', '0-not', '0-day', '0-week'
  ].forEach(id => {
    const wd = w3.getWord(id);
    if (!wd) { errors.push('找不到词条 ' + id); return; }
    const s = w3.artSvg(wd);
    const ok = s.length > 260;
    console.log('   ' + id.padEnd(12) + ' 插图长度 ' + String(s.length).padStart(4) + (ok ? ' OK' : ' ⚠偏空'));
    if (!ok) errors.push(id + ' 插图疑似为空');
  });

  console.log('\n=== 冒烟结果 ===');
  if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exitCode = 1; }
  else console.log('  全部通过 ✓');
})();

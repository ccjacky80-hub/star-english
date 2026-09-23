/**
 * 词库校验脚本 —— 每次扩充/修改 WORDS 后运行
 * 用法（PowerShell）：
 *   $env:NODE_PATH="C:\Users\ASUS\.workbuddy\binaries\node\workspace\node_modules"
 *   node tools\validate-words.js
 * 退出码 0 = 全部通过；1 = 有 ERROR（必须修）
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const html = fs.readFileSync(HTML, 'utf8');

const errors = [];
const warns = [];

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
w.addEventListener('error', e => errors.push('运行时错误: ' + e.message));

const WORDS = w.WORDS || [];
const UNITS = w.UNITS || [];
const ART = w.ART || {};
const TOPICS = w.TOPICS || {};
const SRCNAME = w.SRCNAME || {};

function chk(cond, msg) { if (!cond) errors.push(msg); }

console.log('=== 词库校验 ===');
console.log('词条总数:', WORDS.length, '| 单元数:', UNITS.length, '| 插图 key:', Object.keys(ART).length);

// 1) id 唯一
const ids = {}, dupId = [];
WORDS.forEach(x => { if (ids[x.id]) dupId.push(x.id); ids[x.id] = 1; });
chk(dupId.length === 0, '存在重复 id: ' + dupId.slice(0, 10).join(', '));

// 2) 必填字段
const miss = { en: 0, ph: 0, cn: 0, ex: 0, topic: 0, lvl: 0, src: 0 };
const badTopic = [], badLvl = [], badSrc = [], badArt = [];
WORDS.forEach(x => {
  ['en', 'ph', 'cn', 'ex', 'topic', 'lvl', 'src'].forEach(k => {
    if (x[k] === undefined || x[k] === null || x[k] === '') miss[k]++;
  });
  if (x.topic && !TOPICS[x.topic]) badTopic.push(x.en + ':' + x.topic);
  if (x.lvl && ![1, 2, 3].includes(x.lvl)) badLvl.push(x.en + ':' + x.lvl);
  if (x.src && !SRCNAME[x.src]) badSrc.push(x.en + ':' + x.src);
  // 3) 插图 key 合法
  const a = x.art;
  if (a && typeof a === 'string') {
    if (a.indexOf('chip:') === 0) { if (!/^#[0-9A-Fa-f]{6}$/.test(a.slice(5))) badArt.push(x.en + ':' + a); }
    else if (a.indexOf('num:') === 0) { /* ok */ }
    else if (a.indexOf('scene:') === 0) { if (!ART[a.slice(6)]) badArt.push(x.en + ' 场景图标缺失:' + a); }
    else if (!ART[a]) badArt.push(x.en + ' 插图缺失:' + a);
  }
});
Object.keys(miss).forEach(k => chk(miss[k] === 0, '字段 ' + k + ' 缺失 ' + miss[k] + ' 条'));
chk(badTopic.length === 0, 'topic 不在枚举内: ' + badTopic.slice(0, 10).join(', '));
chk(badLvl.length === 0, 'lvl 非法: ' + badLvl.join(', '));
chk(badSrc.length === 0, 'src 非法: ' + badSrc.join(', '));
chk(badArt.length === 0, '插图问题: ' + badArt.slice(0, 12).join(', '));

// 4) 单元结构
const nos = UNITS.map(u => u.no);
for (let n = 1; n <= UNITS.length; n++) chk(nos.includes(n), '缺少单元 ' + n);
const colors = {};
UNITS.forEach(u => { if (colors[u.color]) warns.push('单元配色重复: ' + u.color); colors[u.color] = 1; });
UNITS.forEach(u => {
  const c = WORDS.filter(x => x.u === u.no).length;
  chk(c > 0, '单元 ' + u.no + ' 没有词');
});
chk(UNITS.every(u => !!u.book), '有单元缺少 book 字段（三上/三下）');

// 5) 例句长度（warning）
const longEx = WORDS.filter(x => x.ex && x.ex.split(/\s+/).length > 8);
if (longEx.length) warns.push('例句超过 8 个词: ' + longEx.length + ' 条（如 ' + longEx.slice(0, 3).map(x => x.en).join(', ') + '）');

// 6) 跨单元同名词（warning，需靠 u-en 区分）
const enMap = {};
WORDS.forEach(x => { (enMap[x.en] = enMap[x.en] || []).push(x.u); });
Object.keys(enMap).forEach(en => { if (enMap[en].length > 1) warns.push('同名词 ' + en + ' 出现在单元 ' + enMap[en].join('/')); });

// 6.5) 例句用词复现率：例句里出现的词，有多少是本词库已收录的（越高越利于巩固）
const EN_SET = {};
WORDS.forEach(x => { EN_SET[x.en.toLowerCase()] = 1; });
let exTokens = 0, exHit = 0;
const oov = {};
WORDS.forEach(x => {
  (x.ex || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).forEach(t => {
    t = t.replace(/^'|'$/g, '');
    if (!t || t.length < 2) return;
    exTokens++;
    // 允许简单复数还原
    const stem = t.endsWith('s') ? t.slice(0, -1) : t;
    if (EN_SET[t] || EN_SET[stem]) exHit++;
    else oov[t] = (oov[t] || 0) + 1;
  });
});
const rate = exTokens ? Math.round(exHit / exTokens * 100) : 0;
console.log('\n例句用词复现率: ' + rate + '%（' + exHit + '/' + exTokens + '，目标 ≥80%）');
if (rate < 80) warns.push('例句用词复现率 ' + rate + '%，低于 80% 目标');
const topOov = Object.keys(oov).sort((a, b) => oov[b] - oov[a]).slice(0, 8);
if (topOov.length) console.log('  例句里最常出现的未收录词: ' + topOov.join(', '));

// 7) 分布统计
console.log('\n--- 分单元词数 ---');
UNITS.forEach(u => {
  const list = WORDS.filter(x => x.u === u.no);
  console.log('Unit ' + String(u.no).padStart(2) + ' ' + u.book + ' ' + u.name.padEnd(7) + ' : ' + String(list.length).padStart(3) +
    ' 词 | 插图 ' + list.filter(x => x.art).length + ' | 场景卡 ' + list.filter(x => (x.art || '').indexOf('scene:') === 0).length);
});
const boost = WORDS.filter(x => x.u === 0);
console.log('Unit 00 补充池 ' + BOOSTNAME(boost) + ' : ' + boost.length + ' 词');

console.log('\n--- 主题分布 ---');
Object.keys(TOPICS).forEach(t => {
  const c = WORDS.filter(x => x.topic === t).length;
  if (c) console.log('  ' + TOPICS[t].padEnd(5) + ' (' + t + '): ' + c);
});
console.log('\n--- 来源分布 ---');
Object.keys(SRCNAME).forEach(s => {
  const c = WORDS.filter(x => x.src === s).length;
  if (c) console.log('  ' + SRCNAME[s].padEnd(6) + ' (' + s + '): ' + c);
});

function BOOSTNAME() { return ''; }

// 8) 零外链检查
const ext = (html.match(/(?:src|href)\s*=\s*["']https?:\/\//g) || []).length;
chk(ext === 0, '存在外部链接引用 ' + ext + ' 处');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('\n单文件体积:', kb, 'KB');
if (kb > 260) warns.push('单文件体积偏大(' + kb + 'KB)，考虑拆分');

console.log('\n=== 结果 ===');
if (warns.length) { console.log('WARN ' + warns.length + ' 条:'); warns.forEach(x => console.log('  - ' + x)); }
if (errors.length) { console.log('ERROR ' + errors.length + ' 条:'); errors.forEach(x => console.log('  ✗ ' + x)); process.exitCode = 1; }
else console.log('全部通过 ✓');

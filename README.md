# 星星英语 Star English

给 8 岁小朋友做的**英语词汇 + 发音互动工作台**。真正的单文件网页，`index.html` 一个文件搞定，双击就能用，也能直接部署到 Cloudflare Pages。

## 一、里面有什么

| 模块 | 说明 |
|---|---|
| **今日** | 首屏「今天要处理」：今天要练的单词清单，前几天没做完的自动顺延并标红，一键跳过去练 |
| **学习** | 单词卡片：插图 + 单词 + 音标 + 中文（先藏后亮）+ 例句；「听一听 / 听例句 / 我来读一读」；掌握度记录 + 间隔复习（ Leitner 盒子，1/2/4/7/15 天） |
| **成长** | 星星积分 + 等级头衔、**12 个单元**的闯关地图（三上 6 个 + 三下 6 个，学完上一单元 60% 才解锁）、当月打卡日历、连续打卡天数 |
| **家长** | 4 位密码；本周练习量柱状图 + 掌握度环形图 + 发音平均分；调每天新词量、**补充词库开关**、朗读语速、打分模式；数据导出 / 重置 / 清空 |

额外还有一个 **听音选词小擂台**：听发音选单词，纯本地判定，答对给星。

## 二、词库

依据 **人教版 PEP 英语（2024 新版）三年级起点，三上 + 三下两册**，再加一个**补充词池**，共 **287 个词条**（三上 109 + 三下 117 + 补充池 61），全部带音标、中文释义和配套例句。例句用词复现率 **96%**（即例句里出现的词 96% 都能在词库里找到，不会出现看不懂的生词）。

### 三上（Unit 1–6，109 词）

| 单元 | 主题 | 词数 |
|---|---|---|
| Unit 1 | 交朋友 Making friends | 18 |
| Unit 2 | 不同的家庭 Different families | 20 |
| Unit 3 | 了不起的动物 Amazing animals | 21 |
| Unit 4 | 身边的植物 Plants around us | 19 |
| Unit 5 | 多彩的世界 The colourful world | 16 |
| Unit 6 | 数字乐园 Numbers | 15 |

### 三下（Unit 7–12，117 词）

| 单元 | 主题 | 词数 |
|---|---|---|
| Unit 7 | 新同学新朋友 My new friends | 23 |
| Unit 8 | 我的小动物 My lovely pet | 24 |
| Unit 9 | 感官与文具 My senses | 19 |
| Unit 10 | 美味的食物 Yummy food | 17 |
| Unit 11 | 我的小房间 Where is my ball? | 18 |
| Unit 12 | 数字与购物 Numbers and shopping | 16 |

### 补充池（Unit 0，61 词）

`u=0` 的特殊分组：**不占闯关地图**，由家长模式里的「补充词库」开关控制，开启后每天额外混入 1–5 个（默认 2 个）。收录课本没单独列、但造句必需的功能词，分六类：

| 类别 | 词条 |
|---|---|
| 代词 / 限定词 | I you we they it my your our me us him he she what how this that these those the |
| be 动词 | is are am |
| 疑问词 | what how who where why when |
| 介词 / 方位 | to for with at in on under here there |
| 高频动词 | play read eat drink run look say go come like want see do let wash open close write |
| 应答 / 否定 | yes no please thanks hello sorry not |
| 时间 / 天气 | morning afternoon evening night today tomorrow birthday day week sunny rainy windy cloudy hot cold |
| 其他 | happy |

> 说明：`he / she / me / us / these / who / where / go / like / see / say / today` 已包含在三上/三下课本单元里，补充池不再重复收录。

### 词条数据结构

```js
{ u:7, en:'teacher', ph:'/ˈtiːtʃə(r)/', cn:'老师', ex:'She is my teacher.',
  art:'teacher', topic:'school', lvl:2, src:'pep3b' }   // id 由 u-en 生成："7-teacher"
```

| 字段 | 说明 |
|---|---|
| `u` | 单元号；`0` = 补充池 |
| `en/ph/cn/ex` | 单词 / 音标 / 中文 / 例句（例句控制在 8 个词以内） |
| `art` | 内联 SVG 插图 key；`chip:#hex` 色块（颜色词）、`num:8` 数字卡、`scene:xxx` 抽象词场景卡 |
| `topic` | 主题：body / family / animal / plant / colour / number / food / school / home / thing / action / feeling / func / place / time / sense / weather |
| `lvl` | 难度：1 = 三上，2 = 三下，3 = 拓展 |
| `src` | 来源：pep3a / pep3b / func / topic |

`id` 规则保持 `u-en` 不变（例如 `4-orange` 水果 与 `5-orange` 颜色），**已积累的星星与掌握度不会因为扩充词库而丢失**。

### 改词库后请跑校验

```powershell
$env:NODE_PATH="C:\Users\ASUS\.workbuddy\binaries\node\workspace\node_modules"
node tools\validate-words.js    # 字段完整性 / id 唯一 / 插图是否存在 / 例句复现率 / 体积
node tools\smoke-test.js        # 首次打开、老备份导入、补充池开关、解锁链、学习流程
```

## 三、发音功能怎么用（重要）

- **朗读（听一听 / 听例句）**：浏览器自带 TTS **离线可用**，所有现代浏览器都支持。首次点可能要等 1 秒加载语音包。
- **跟读打分（我来读一读）**：用浏览器语音识别自动打分，**需要联网 + HTTPS + Chrome / Edge**。国内网络不保证稳定。
- **自动降级**：识别不可用、被拒绝、超时或太安静时，会自动切成 **录音回听自评**——录 4 秒，跟着原声对比，自己评「读得像 / 还要练」。孩子感知不到失败。
- 家长模式里可以把打分方式固定为「仅录音自评」。
- **必须 HTTPS**：Chrome 的语音识别和录音都要求安全上下文，`file://` 直接双击打开时麦克风会被屏蔽。本地想测完整的跟读功能，请用 `npx serve` 之类起个本地服务器。

## 四、部署到 GitHub + Cloudflare Pages

1. 新建 GitHub 仓库（例如 `star-english`），把 `index.html` 和本 `README.md` 传上去。
2. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
3. 选中仓库，构建配置保持默认即可：
   - Framework preset：`None`
   - Build command：**留空**
   - Build output directory：`/`
4. 点 **Save and Deploy**，等十几秒就拿到 `https://xxx.pages.dev` 链接。之后每次 `git push` 会自动重新部署。

手机上加到桌面：用浏览器打开链接 → 分享 → **添加到主屏幕**，就变成一个 App 图标。

## 五、数据说明

- 数据存在**浏览器 localStorage**，每个设备 / 每份浏览器各自独立，**不会跨设备同步**。
- 页面首屏有 **导出备份（JSON）** 和 **从备份导入恢复**，换设备、清缓存前请先导出。
- 部署后的链接是公网可访问的，**页面里没有预填任何隐私信息**（没有真名、没有学校、没有照片）。
- 首次打开会看到预置的示例进度，点「清空示例重新开始」即从 Unit 1 正式开始。

## 六、技术约束（刻意遵守的）

- **单文件 HTML**，CSS / JS / SVG 插图全部内联
- **零外部依赖**：不引任何 CDN、字体、图表库、图片；图表和 icon 均为手写内联 SVG
- 适配移动端：窄屏单列、按钮 ≥ 44px、输入框 ≥ 16px、底部安全区留白
- 离线可用：断网也能继续练（除云端发音打分外）

## 七、后续可以加

- **阶段 3**：主题拓展约 120 词（食物饮料、衣物、交通、星期月份、反义形容词、日常动作），并加主题筛选器
- 单词图鉴收集册
- 家长奖励兑换星星
- 单词图鉴收集册
- 家长奖励兑换星星
- 跨设备同步（Cloudflare Workers + KV）

扩充时照这套流程走：优先课本 → 其次课标 2022 二级词表 → 再次高频词与课本取交集；新词必须带 `topic / lvl / src`，改完跑 `tools\validate-words.js`。

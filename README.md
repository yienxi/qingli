# 轻历 QingLi

> 一看就懂的极简中国日历。
> Clean, minimal Chinese calendar — lunar, solar terms, yiji, holidays, at a glance.

**轻历**把每一天的农历、节气、宜忌、节日排成一张月视图，打开即用，无需注册，可添加到主屏幕当原生 App 用。

---

## Why

中国的日期信息很复杂——公历、农历、节气、宜忌、法定节假日、调休、传统节日……想看明白今天是什么日子，通常要打开好几个 App，还要忍受广告、开屏、推送。

轻历不解决"复杂"，解决"麻烦"。它把所有信息摊成一张干净的月历，看一眼就知道今天农历几月初几、宜不宜出门、有没有放假。

## Features

| | |
|---|---|
| **月视图日历** | 公历 + 农历双显示，节气、节日、宜忌、冲煞一目了然 |
| **今日卡片** | 实时时钟、年月日星期、干支生肖、宜忌详情白话解释 |
| **个人事件** | 点击日期添加日程/纪念日，localStorage 存储，跨会话持久 |
| **iCal 订阅** | 一键订阅到 Apple / Google / Outlook 日历，自动同步全年节假日 |
| **AI 宜忌摘要** | 可选的 AI 自然语言解读当日宜忌（调用你自配的 API key） |
| **分享卡片** | 生成 1080×1080 宜忌大图，可保存到相册或分享 |
| **PWA** | 可添加到主屏幕，离线时可查看缓存的节假日数据 |
| **深色模式** | 浅色/深色一键切换，护眼舒适 |
| **零账户** | 无需注册、无需登录，打开即用，数据在本地 |
| **纯静态** | 无后端、无数据库，部署到 Vercel 一行命令 |

## Quick Start

```bash
npm install
npm run dev    # vercel dev 本地预览
npm run deploy # vercel deploy --prod
```

部署后打开浏览器即可使用。

## iCal 订阅

部署后，将以下地址添加到 Apple 日历 / Google Calendar / Outlook：

```
https://你的域名/api/ical?type=all
```

| 参数 | 说明 |
|------|------|
| `type=all` | 全部（节假日 + 农历节日 + 节气）|
| `type=holidays` | 法定节假日 + 调休 |
| `type=lunar` | 传统农历节日 |
| `type=terms` | 二十四节气 + 法定节日 |

所有日期数据由天文算法实时计算，**不依赖静态 CSV 或人工更新**。

## Tech Stack

- **前端**: 零框架 —— 纯 HTML + CSS (自定义属性 tokens) + Vanilla JS
- **农历引擎**: [lunar-typescript](https://github.com/6tail/lunar-typescript) · MIT —— 天文算法实时计算，行业标准（周下载 6W+）
- **日历渲染**: 原生 DOM 操作，无虚拟 DOM 依赖
- **存储**: 浏览器 localStorage (事件数据)
- **部署**: Vercel Edge Functions (iCal / AI 摘要 API)
- **PWA**: Service Worker 预缓存 + 离线 fallback

## Project Structure

```
qingli/
├── index.html                 # 主页面 + OG Meta / PWA manifest link
├── css/
│   ├── design-system.css      # 设计系统 tokens (颜色/字号/间距)
│   ├── calendar.css           # 日历组件 + 今日卡片 + 详情面板
│   └── responsive.css         # 响应式断点
├── js/
│   ├── calendar.js            # 日历引擎 — 渲染 + 数据计算
│   ├── app.js                 # 应用入口 — 事件绑定 + 分享卡片 + 主题
│   └── events.js              # 事件管理 CRUD (localStorage)
├── api/
│   ├── _festivals.js          # 共享数据源 — 节日名/宜忌解释/特殊日
│   ├── ical.js                # iCal 订阅 Edge Function
│   ├── holidays.js            # 节假日查询 API
│   └── ai-summary.js          # AI 宜忌摘要 API
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── offline.html           # 离线 fallback
├── packages/
│   └── lunar/                 # @qingli/lunar npm 包
├── vercel.json
└── package.json
```

## Data Accuracy

QingLi 的数据全部由算法实时计算，**没有任何人为编造或静态 CSV**：

| 数据 | 来源 | 精度 |
|------|------|------|
| 农历月日 | 授时历天文算法（朔望月） | 天文级 |
| 二十四节气 | 太阳黄经精确计算 | 天文级 |
| 干支 | 农历日期推算 | 标准 |
| 宜忌 | 月干支 + 日干支索引通书编码 | 通书标准 |
| 冲煞/值神 | 日干支查固定表 | 传统文化定式 |
| 法定节假日 | 国务院公告编码（库维护者更新） | 权威 |
| 纳音/星宿 | 干支检索固定表 | 传统文化定式 |

**例外**：传统节日名称（春节、端午等）和宜忌白话解释是硬编码的文化定式，因为它们是命名而不是数据。

## Screenshots

<!-- TODO: Add screenshots -->

## License

MIT © yienxi

# 轻历 (QingLi)

轻量级中国日历工具 —— 农历、节气、节假日，一眼看清。

## 特性

- **月视图日历** — 公历 + 农历 + 节气 + 法定节假日 + 传统节日，一目了然
- **个人事件** — 点击日期添加日程，存储在浏览器本地
- **响应式设计** — 桌面 + 手机自适应，PWA 可添加到主屏幕
- **iCal 订阅** — 一键订阅到 Apple 日历 / Google Calendar / Outlook，自动同步
- **深色模式** — 支持浅色/深色切换
- **零账户** — 无需注册，打开即用
- **纯静态** — 无后端依赖，部署到 Vercel / GitHub Pages

## 快速开始

### 线上访问

部署后打开对应 URL 即可。

### 本地开发

```bash
npm install
npm run dev
```

### 部署到 Vercel

```bash
npm i -g vercel
vercel
```

## 项目结构

```
qingli/
├── index.html              # 主页面
├── css/
│   ├── design-system.css   # 设计系统 tokens
│   ├── calendar.css        # 日历组件样式
│   └── responsive.css      # 响应式断点
├── js/
│   ├── calendar.js         # 日历引擎 (lunar-typescript)
│   ├── events.js           # 事件管理 (localStorage)
│   └── app.js              # 应用入口
├── api/
│   └── ical.js             # iCal Edge Function (Vercel)
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service Worker
├── vercel.json             # Vercel 配置
└── package.json
```

## iCal 订阅地址

部署后，通过以下地址获取 iCal 订阅链接：

| 类型 | 路径 |
|------|------|
| 全部合并 | `/api/ical?type=all` |
| 法定节假日 | `/api/ical?type=holidays` |
| 农历节日 | `/api/ical?type=lunar` |
| 二十四节气 | `/api/ical?type=terms` |

## 技术栈

- **前端** — 纯 HTML + CSS + Vanilla JS（零框架）
- **农历数据** — [lunar-typescript](https://github.com/6tail/lunar-typescript) (MIT)
- **iCal 生成** — Vercel Edge Functions
- **存储** — 浏览器 localStorage
- **部署** — Vercel

## 开源许可

MIT © yienxi

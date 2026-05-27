# @qingli/lunar

> Chinese lunar calendar utilities — festivals, yiji, solar terms, special days.  
> 农历、节气、宜忌、节日 — 开箱即用，所有数据由天文算法实时计算。

```js
import { getLunarCalendar } from '@qingli/lunar'

const info = getLunarCalendar(2026, 5, 27)
// info.lunar         → { month: 4, day: 11, monthStr: '四', dayStr: '十一' }
// info.ganZhi        → { year: '乙巳', month: '己巳', day: '壬申' }
// info.shengXiao     → '蛇'
// info.yi            → ['嫁娶', '出行', ...]
// info.ji            → ['动土', ...]
// info.festivals     → ['520'] (or ['春节'] on that day)
// info.solarTerm     → '小满' or null
// info.isHoliday     → true/false
```

## Install

```bash
npm install @qingli/lunar
```

## API

### `getLunarCalendar(year, month, day)`

| Field | Type | Description |
|-------|------|-------------|
| `lunar.monthStr` | string | 四 |
| `lunar.dayStr` | string | 十一 |
| `lunar.yearStr` | string | 二〇二六 |
| `ganZhi.year` | string | 乙巳 |
| `ganZhi.month` | string | 己巳 |
| `ganZhi.day` | string | 壬申 |
| `shengXiao` | string | 蛇 |
| `yi` | string[] | 当日宜事列表 |
| `ji` | string[] | 当日忌事列表 |
| `yiExplained` | {key, explain}[] | 宜事白话解释 |
| `jiExplained` | {key, explain}[] | 忌事白话解释 |
| `solarTerm` | string\|null | 节气名，非节气日则为 null |
| `traditionalFestival` | string\|null | 农历节日，如"端午节" |
| `specialDay` | string\|null | 公历特殊日，如"520" |
| `festivals` | string[] | 当日所有节日/节气汇总 |
| `isHoliday` | boolean | 是否法定节假日 |
| `isWorkday` | boolean | 是否调休工作日 |
| `chongSha` | string | 冲煞生肖 |
| `zhiXing` | string | 值神 |
| `wuXing` | string | 纳音五行 |
| `xiu` | string | 二十八星宿 |
| `positionXi` | string | 喜神方位 |
| `positionCai` | string | 财神方位 |

### `getMonthCalendar(year, month)`

Returns array of `getLunarCalendar` for every day of the month.

### Data exports

```js
import { TRADITIONAL_FESTIVALS, SPECIAL_DAYS, SOLAR_TERM_NAMES, YIJI_EXPLAIN } from '@qingli/lunar'
```

## Data provenance

- **农历·干支·节气·生肖**: `lunar-typescript` 天文算法（授时历）实时计算
- **宜忌**: 月干支 + 日干支索引通书编码表
- **法定节假日**: `lunar-typescript` 维护的国务院公告编码
- **传统节日名称 + 宜忌解释**: 硬编码文化定式

## License

MIT

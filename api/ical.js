export const runtime = 'edge'

import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { TRADITIONAL_FESTIVALS, SOLAR_TERM_NAMES, YIJI_EXPLAIN } from './_festivals.js'

function esc(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function icalDate(y, m, d) {
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}

function vevent(dateStr, summary, desc) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return [
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${esc(summary)}`,
    desc ? `DESCRIPTION:${esc(desc)}` : '',
    `DTSTAMP:${now}`,
    `UID:${dateStr}-${summary.replace(/\s/g, '')}@qingli`,
    'END:VEVENT',
  ].filter(Boolean).join('\n') + '\n'
}

function buildSolarTermLookup(year) {
  const lookup = {}
  for (const ly of [year - 1, year, year + 1]) {
    try {
      const lunar = Lunar.fromYmd(ly, 1, 1)
      const table = lunar.getJieQiTable()
      for (const [name, s] of Object.entries(table)) {
        if (/[\u4e00-\u9fff]/.test(name)) {
          const key = `${s.getYear()}-${s.getMonth()}-${s.getDay()}`
          if (!lookup[key]) lookup[key] = name
        }
      }
    } catch (e) { console.warn('buildSolarTermLookup error:', e) }
  }
  return lookup
}

function generateHolidayEvents(year) {
  let events = ''
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      try {
        const h = HolidayUtil.getHoliday(year, m, d)
        if (h) {
          const name = h.getName()
          const isWork = h.isWork()
          const desc = isWork ? `${name}（调休上班）` : name
          events += vevent(icalDate(year, m, d), name, desc)
        }
      } catch (e) { console.warn('generateHolidayEvents error:', e) }
    }
  }
  return events
}

function generateLunarFestivalEvents(year) {
  let events = ''
  for (const [key, name] of Object.entries(TRADITIONAL_FESTIVALS)) {
    const [lm, ld] = key.split('/').map(Number)
    try {
      const lunar = Lunar.fromYmd(year, lm, ld)
      const solar = lunar.getSolar()
      if (solar) {
        const dateStr = icalDate(solar.getYear(), solar.getMonth(), solar.getDay())
        events += vevent(dateStr, name, `农历${name}`)
      }
    } catch (e) { console.warn('generateLunarFestivalEvents error:', e) }
  }
  return events
}

function generateSolarTermEvents(year) {
  let events = ''
  const lookup = buildSolarTermLookup(year)
  for (const [dateKey, termName] of Object.entries(lookup)) {
    const [y, m, d] = dateKey.split('-').map(Number)
    if (y === year) {
      events += vevent(icalDate(y, m, d), termName, `二十四节气 · ${termName}`)
    }
  }
  return events
}

function generateYijiEvents(year) {
  let events = ''
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      try {
        const solar = Solar.fromYmd(year, m, d)
        const lunar = solar.getLunar()
        const yi = lunar.getDayYi()
        const ji = lunar.getDayJi()
        if (yi.length > 0 || ji.length > 0) {
          const yiStr = yi.length > 0 ? `宜: ${yi.slice(0, 6).map(k => YIJI_EXPLAIN[k] || k).join('、')}` : ''
          const jiStr = ji.length > 0 ? `忌: ${ji.slice(0, 6).map(k => YIJI_EXPLAIN[k] || k).join('、')}` : ''
          const desc = [yiStr, jiStr].filter(Boolean).join(' · ')
          events += vevent(icalDate(year, m, d), '黄历宜忌', desc)
        }
      } catch (e) { console.warn('generateYijiEvents error:', e) }
    }
  }
  return events
}

function generateFestivalEvents(year) {
  return generateHolidayEvents(year) + generateLunarFestivalEvents(year)
}

function generateICal(type, year) {
  const years = [year - 1, year, year + 1]
  const calNameMap = { all: '', festivals: ' · 节日与假期', terms: ' · 节气', yiji: ' · 每日宜忌' }
  const suffix = calNameMap[type] || ''

  let cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//轻历//QingLi//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:轻历${suffix}`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    '',
  ].join('\n')

  for (const y of years) {
    if (type === 'all' || type === 'festivals') cal += generateFestivalEvents(y)
    if (type === 'all' || type === 'terms') cal += generateSolarTermEvents(y)
    if (type === 'all' || type === 'yiji') cal += generateYijiEvents(y)
  }

  cal += 'END:VCALENDAR\n'
  return cal
}

export async function GET(request) {
  const url = new URL(request.url)
  let type = url.searchParams.get('type') || 'all'

  if (type === 'holidays' || type === 'lunar') {
    type = 'festivals'
  }

  if (!['all', 'festivals', 'terms', 'yiji'].includes(type)) {
    return new Response('Invalid type', { status: 400 })
  }

  try {
    const icalContent = generateICal(type, new Date().getFullYear())
    return new Response(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="qingli-${type}.ics"`,
        'Cache-Control': 'public, max-age=21600, s-maxage=43200',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}

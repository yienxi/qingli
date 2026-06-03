import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { TRADITIONAL_FESTIVALS, SOLAR_TERM_NAMES, YIJI_EXPLAIN } from './data/festivals.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = 8000

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function getYiJi(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const solar = Solar.fromYmd(y, m, d)
  const lunar = solar.getLunar()
  return {
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    solarTerm: getSolarTerm(y, m, d),
    festival: getLunarFestival(lunar),
  }
}

function getSolarTerm(year, month, day) {
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  const table = lunar.getJieQiTable()
  const dateKey = `${year}-${month}-${day}`
  for (const [name, termSolar] of Object.entries(table)) {
    if (/[\u4e00-\u9fff]/.test(name)) {
      const termKey = `${termSolar.getYear()}-${termSolar.getMonth()}-${termSolar.getDay()}`
      if (termKey === dateKey) {
        return name
      }
    }
  }
  return null
}

function getLunarFestival(lunar) {
  const month = lunar.getMonth()
  const day = lunar.getDay()
  return TRADITIONAL_FESTIVALS[`${month}/${day}`] || null
}

function buildFallbackSummary(data) {
  const yiList = data.yi.slice(0, 4).join('、')
  const jiList = data.ji.slice(0, 3).join('、')
  let summary = `宜：${yiList || '诸事不宜'}`
  if (jiList) summary += `，忌：${jiList}`
  if (data.festival) summary += ` | ${data.festival}`
  if (data.solarTerm) summary += ` | ${data.solarTerm}`
  return summary
}

async function generateAISummary(data, apiKey, dateStr) {
  if (!apiKey || apiKey.length < 10) return null

  const yiList = data.yi.slice(0, 6).join('、') || '无'
  const jiList = data.ji.slice(0, 4).join('、') || '无'
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateLabel = `${y}年${m}月${d}日`

  let extra = ''
  if (data.festival) extra += `\n今天是${data.festival}。`
  if (data.solarTerm) extra += `\n今天是${data.solarTerm}。`

  const prompt = `你是一个有趣的黄历解读助手，专门给年轻人看。

今天是${dateLabel}，农历${data.lunarMonth}月${data.lunarDay}。

宜：${yiList}
忌：${jiList}${extra}

请用轻松幽默、一针见血的口吻写一句话（30-50字），帮现代职场/学生快速理解今天适合做什么。不用古文，不用「宜」「忌」这些词。

只输出一句话，不要任何其他内容。`

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('DeepSeek API error:', res.status, errorText)
      return null
    }

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content?.trim()
    if (text) return text.replace(/^["']|["']$/g, '')
    return null
  } catch (e) {
    console.error('Failed to generate AI summary:', e)
    return null
  }
}

/* ----- API Handlers ----- */

async function handleAISummary(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const date = url.searchParams.get('date')
  const now = new Date()
  const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  try {
    const data = getYiJi(dateStr)
    const apiKey = process.env.DEEPSEEK_API_KEY || ''

    let summary = null
    let generated = false

    if (apiKey) {
      summary = await generateAISummary(data, apiKey, dateStr)
      if (summary) generated = true
    }

    if (!summary) {
      summary = buildFallbackSummary(data)
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({ summary, generated, festival: data.festival, solarTerm: data.solarTerm }))
  } catch (e) {
    console.error('Error in ai-summary API:', e)
    const data = getYiJi(dateStr)
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({ summary: buildFallbackSummary(data), generated: false, error: e.message }))
  }
}

async function handleHolidays(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear()

  const holidays = []
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      try {
        const holiday = HolidayUtil.getHoliday(year, m, d)
        if (holiday) {
          holidays.push({
            date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            name: holiday.getName(),
            isWork: holiday.isWork(),
            type: holiday.isWork() ? 'workday' : 'holiday',
          })
        }
      } catch (e) { console.warn('holiday lookup error:', e) }
    }
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=21600',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({ version: '2026.05', year, holidays, updatedAt: new Date().toISOString() }))
}

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
    if (Math.abs(y - year) <= 1) {
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

async function handleICal(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let type = url.searchParams.get('type') || 'all'

  if (type === 'holidays' || type === 'lunar') type = 'festivals'

  if (!['all', 'festivals', 'terms', 'yiji'].includes(type)) {
    res.writeHead(400)
    res.end('Invalid type')
    return
  }

  try {
    const icalContent = generateICal(type, new Date().getFullYear())
    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="qingli-${type}.ics"`,
      'Cache-Control': 'public, max-age=21600',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(icalContent)
  } catch (error) {
    res.writeHead(500)
    res.end(`Error: ${error.message}`)
  }
}

/* ----- Static File Server ----- */

const API_ROUTES = {
  '/api/ai-summary': handleAISummary,
  '/api/holidays': handleHolidays,
  '/api/ical': handleICal,
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`)

  const urlWithoutQuery = req.url.split('?')[0]

  const handler = API_ROUTES[urlWithoutQuery]
  if (handler) {
    handler(req, res)
    return
  }

  let filePath = '.' + urlWithoutQuery
  if (filePath === './') {
    filePath = './index.html'
  }

  const extname = String(path.extname(filePath)).toLowerCase()
  const contentType = MIME_TYPES[extname] || 'application/octet-stream'

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<h1>404 Not Found</h1>', 'utf-8')
      } else {
        res.writeHead(500)
        res.end(`Server Error: ${error.code}`, 'utf-8')
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content, 'utf-8')
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})

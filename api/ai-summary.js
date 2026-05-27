export const runtime = 'edge'

import { Solar, Lunar } from 'lunar-typescript'

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

function getSolarTerm(y, m, d) {
  try {
    const lunar = Lunar.fromYmd(y, 1, 1)
    const table = lunar.getJieQiTable()
    for (const [name, s] of Object.entries(table)) {
      if (s.getYear() === y && s.getMonth() === m && s.getDay() === d) {
        return name
      }
    }
  } catch {}
  return null
}

function getLunarFestival(lunar) {
  const m = lunar.getMonth()
  const d = lunar.getDay()
  const map = {
    '1/1': '春节', '1/15': '元宵节', '5/5': '端午节', '7/7': '七夕节',
    '7/15': '中元节', '8/15': '中秋节', '9/9': '重阳节',
    '12/8': '腊八节', '12/30': '除夕',
  }
  return map[`${m}/${d}`] || null
}

function buildFallbackSummary(data) {
  const parts = []

  if (data.festival) {
    parts.push(`今天是${data.festival}`)
  }

  if (data.solarTerm) {
    parts.push(`节气${data.solarTerm}`)
  }

  if (data.yi.length > 0) {
    const top = data.yi.slice(0, 3).join('、')
    parts.push(`宜${top}`)
  }

  if (data.ji.length > 0) {
    const top = data.ji.slice(0, 2).join('、')
    parts.push(`忌${top}`)
  }

  if (parts.length === 0) parts.push('今日诸事平稳')

  return parts.join('，') + '。'
}

async function generateAISummary(data, apiKey) {
  const yiStr = data.yi.slice(0, 8).join('、') || '无'
  const jiStr = data.ji.slice(0, 5).join('、') || '无'
  const now = new Date()
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  let extra = ''
  if (data.festival) extra += `\n今天是${data.festival}。`
  if (data.solarTerm) extra += `\n今天是节气${data.solarTerm}。`

  const prompt = `你是黄历解读助手。今天是${todayStr}，农历${data.lunarMonth}${data.lunarDay}。\n宜：${yiStr}\n忌：${jiStr}${extra}\n\n请用轻松幽默、一针见血的口吻写一句话（40字内），帮现代职场年轻人快速理解今天适合做什么。不要用古文，不用「宜」「忌」字。`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.8,
      }),
    })

    if (!res.ok) return null

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content?.trim()
    return text || null
  } catch {
    return null
  }
}

export async function GET(request) {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const dateStr = date || [
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  ].join('-')

  try {
    const data = getYiJi(dateStr)
    const apiKey = request.headers.get('x-ai-key') || ''

    let summary = null
    let generated = false

    if (apiKey && apiKey.length > 10) {
      summary = await generateAISummary(data, apiKey)
      generated = true
    }

    if (!summary) {
      summary = buildFallbackSummary(data)
      generated = false
    }

    return new Response(JSON.stringify({
      summary,
      generated,
      festival: data.festival,
      solarTerm: data.solarTerm,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      summary: buildFallbackSummary(getYiJi(dateStr)),
      generated: false,
      error: error.message,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
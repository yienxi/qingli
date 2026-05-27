export const runtime = 'edge'

import { HolidayUtil } from 'lunar-typescript'

// 数据版本号，更新节假日数据时递增
const DATA_VERSION = '2026.05'

export async function GET(request) {
  const url = new URL(request.url)
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
            type: holiday.isWork() ? 'workday' : 'holiday'
          })
        }
        } catch (e) { console.warn('holiday lookup error:', e) }
    }
  }

  return Response.json({
    version: DATA_VERSION,
    year,
    holidays,
    updatedAt: new Date().toISOString()
  }, {
    headers: {
      'Cache-Control': 'public, max-age=21600, s-maxage=43200',
      'Access-Control-Allow-Origin': '*',
    }
  })
}

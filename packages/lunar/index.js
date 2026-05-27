import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { TRADITIONAL_FESTIVALS, SPECIAL_DAYS, SOLAR_TERM_NAMES, YIJI_EXPLAIN, getFloatingSpecialDays } from './festivals.js'

const FETIVAL_KEYS = Object.keys(TRADITIONAL_FESTIVALS)
const SOLAR_TERM_SET = new Set(SOLAR_TERM_NAMES)

function pad(n) {
  return String(n).padStart(2, '0')
}

export function getLunarCalendar(year, month, day) {
  const dateStr = `${year}-${pad(month)}-${pad(day)}`
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()

  const lunarMonth = lunar.getMonth()
  const lunarDay = lunar.getDay()
  const lunarMonthChinese = lunar.getMonthInChinese()
  const lunarDayChinese = lunar.getDayInChinese()
  const yearGanZhi = lunar.getYearInGanZhi()
  const monthGanZhi = lunar.getMonthInGanZhi()
  const dayGanZhi = lunar.getDayInGanZhi()
  const shengXiao = lunar.getYearShengXiao()

  const yiList = lunar.getDayYi()
  const jiList = lunar.getDayJi()

  const yiExplained = yiList.map(t => ({ key: t, explain: YIJI_EXPLAIN[t] || '' }))
  const jiExplained = jiList.map(t => ({ key: t, explain: YIJI_EXPLAIN[t] || '' }))

  const lunarKey = `${lunarMonth}/${lunarDay}`
  const traditionalFestival = TRADITIONAL_FESTIVALS[lunarKey] || null

  const solarTerm = lunar.getJieQi()
  const isSolarTerm = solarTerm && SOLAR_TERM_SET.has(solarTerm)

  const specialDays = getFloatingSpecialDays(year)
  const specialDay = SPECIAL_DAYS[dateStr.slice(5)] || specialDays[dateStr] || null

  const holiday = HolidayUtil.getHoliday(year, month, day)
  const isHoliday = holiday && holiday.isWork() === false
  const isWorkday = holiday && holiday.isWork() === true

  const chongSha = lunar.getDayChongShengXiao()
  const zhiXing = (() => {
    try { return lunar.getZhiXing() } catch { return '' }
  })()
  const wuXing = lunar.getDayNaYin()
  const xiu = lunar.getXiu()
  const positionXi = (() => {
    try { return lunar.getDayPositionXi() } catch { return '' }
  })()
  const positionCai = (() => {
    try { return lunar.getDayPositionCai() } catch { return '' }
  })()

  return {
    date: dateStr,
    lunar: {
      year: lunar.getYear(), month: lunarMonth, day: lunarDay,
      monthStr: lunarMonthChinese, dayStr: lunarDayChinese,
      yearStr: lunar.getYearInChinese(),
    },
    ganZhi: { year: yearGanZhi, month: monthGanZhi, day: dayGanZhi },
    shengXiao,
    yi: yiList,
    ji: jiList,
    yiExplained,
    jiExplained,
    solarTerm: isSolarTerm ? solarTerm : null,
    traditionalFestival,
    festivals: [traditionalFestival, specialDay, isSolarTerm ? solarTerm : null].filter(Boolean),
    specialDay,
    isHoliday,
    isWorkday,
    chongSha,
    zhiXing,
    wuXing,
    xiu,
    positionXi,
    positionCai,
  }
}

export function getDateRange(startDate, endDate) {
  const result = []
  const d = new Date(startDate)
  const end = new Date(endDate)
  while (d <= end) {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
    result.push(getLunarCalendar(y, m, day))
    d.setDate(d.getDate() + 1)
  }
  return result
}

export function getMonthCalendar(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  return getDateRange(new Date(year, month - 1, 1), new Date(year, month - 1, daysInMonth))
}

export { TRADITIONAL_FESTIVALS, SPECIAL_DAYS, SOLAR_TERM_NAMES, YIJI_EXPLAIN, getFloatingSpecialDays }

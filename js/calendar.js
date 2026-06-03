import { Solar, Lunar } from 'lunar-typescript'
import { HolidayService } from './holiday-service.js'
import { TRADITIONAL_FESTIVALS, SPECIAL_DAYS, getFloatingSpecialDays, YIJI_CATEGORIES, YIJI_EXPLAIN } from '../data/festivals.js'

const DAYS_IN_WEEK = 7
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const ZODIAC_NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const DIRECTION_NAMES = { '北': '北方', '南': '南方', '东': '东方', '西': '西方', '东北': '东北方', '西北': '西北方', '东南': '东南方', '西南': '西南方' }

function categorizeYiji(rawList) {
  const groups = {}
  for (const item of rawList) {
    const cat = YIJI_CATEGORIES[item] || '其他'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  return groups
}

function interpretChongsha(raw) {
  if (!raw || raw === '-') return { zodiac: '', direction: '', text: '' }
  const parts = raw.trim().split(/\s+/)
  const chongPart = parts[0] || ''
  const shaPart = parts[1] || ''
  const zodiac = chongPart.replace('冲', '')
  const direction = shaPart.replace('煞', '')
  const dirCn = DIRECTION_NAMES[direction] || direction
  let text = ''
  if (zodiac && ZODIAC_NAMES.includes(zodiac)) {
    text += `属${zodiac}的人，大事（签约、出行、婚嫁）宜谨慎。`
  }
  if (direction) {
    text += `煞气在${dirCn}。`
  }
  return { zodiac, direction: dirCn, text }
}

function formatYijiForCard(groups) {
  const items = []
  for (const [cat, terms] of Object.entries(groups)) {
    items.push(terms.slice(0, 3).join('、'))
  }
  return items.join(' · ')
}

let solarTermCache = {}
let cachedTermYear = null

function buildSolarTermCache(year) {
  if (cachedTermYear === year) return
  solarTermCache = {}
  cachedTermYear = year
  for (const ly of [year - 1, year, year + 1]) {
    try {
      const lunar = Lunar.fromYmd(ly, 1, 1)
      const table = lunar.getJieQiTable()
      for (const [name, termSolar] of Object.entries(table)) {
        if (/[\u4e00-\u9fff]/.test(name)) {
          const key = `${termSolar.getYear()}-${termSolar.getMonth()}-${termSolar.getDay()}`
          if (!solarTermCache[key]) {
            solarTermCache[key] = name
          }
        }
      }
    } catch (e) { console.warn('buildSolarTermCache error:', e) }
  }
}

class Calendar {
  constructor(container) {
    this.container = container
    this.today = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
    }
    this.year = this.today.year
    this.month = this.today.month
    this.selectedDate = null
    this.cachedLunarData = new Map()
    this.holidayService = new HolidayService()
    this.onRender = null
  }

  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  }

  getFirstDayOfMonth(year, month) {
    const d = new Date(year, month - 1, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  computeLunarData(year, month, day) {
    const key = `${year}-${month}-${day}`
    if (this.cachedLunarData.has(key)) {
      return this.cachedLunarData.get(key)
    }
    try {
      buildSolarTermCache(year)
      const solar = Solar.fromYmd(year, month, day)
      const lunar = solar.getLunar()

      const yiList = lunar.getDayYi()
      const jiList = lunar.getDayJi()
      const yiGroups = categorizeYiji(yiList)
      const jiGroups = categorizeYiji(jiList)
      const rawChongsha = '冲' + lunar.getDayChongShengXiao() + ' 煞' + lunar.getDaySha()
      const chongshaInfo = interpretChongsha(rawChongsha)

      const data = {
        lunarDayStr: lunar.getDayInChinese(),
        lunarMonthStr: lunar.getMonthInChinese(),
        lunarYearStr: lunar.getYearInChinese(),
        shengXiao: lunar.getYearShengXiao(),
        ganZhiYear: lunar.getYearInGanZhi(),
        ganZhiMonth: lunar.getMonthInGanZhi(),
        ganZhiDay: lunar.getDayInGanZhi(),
        lunarMonth: lunar.getMonth(),
        lunarDay: lunar.getDay(),
        isLeap: false,
        festival: null,
        solarTerm: null,
        yi: yiList,
        ji: jiList,
        yiGroups,
        jiGroups,
        yiCardText: formatYijiForCard(yiGroups),
        jiCardText: formatYijiForCard(jiGroups),
        chongSha: rawChongsha,
        chongshaInfo,
        zhiShen: lunar.getZhiXing(),
        naYin: lunar.getDayNaYin(),
        xingXiu: lunar.getXiu(),
        xiShen: lunar.getDayPositionXi(),
        caiShen: lunar.getDayPositionCai(),
      }

      const lunarKey = `${lunar.getMonth()}/${lunar.getDay()}`
      data.festival = TRADITIONAL_FESTIVALS[lunarKey] || null
      const termKey = `${year}-${month}-${day}`
      const term = solarTermCache[termKey]
      if (term) {
        data.solarTerm = term
      }
      const flatKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      data.specialDay = SPECIAL_DAYS[flatKey] || null
      if (!data.specialDay) {
        const floatDays = getFloatingSpecialDays(year)
        data.specialDay = floatDays[`${year}-${flatKey}`] || null
      }
      this.cachedLunarData.set(key, data)
      return data
    } catch (e) {
      console.warn('computeLunarData error:', e)
      return null
    }
  }

  async getHoliday(year, month, day) {
    try {
      return await this.holidayService.isHoliday(year, month, day)
    } catch (e) {
      console.warn('getHoliday error:', e)
      return null
    }
  }

  isToday(year, month, day) {
    return year === this.today.year && month === this.today.month && day === this.today.day
  }

  isWeekend(dayIndex) {
    return dayIndex === 5 || dayIndex === 6
  }

  async render() {
    this.showLoading()

    const daysInMonth = this.getDaysInMonth(this.year, this.month)
    const firstDayIndex = this.getFirstDayOfMonth(this.year, this.month)
    const prevMonth = this.month === 1 ? 12 : this.month - 1
    const prevYear = this.month === 1 ? this.year - 1 : this.year
    const daysInPrevMonth = this.getDaysInMonth(prevYear, prevMonth)

    const navYear = document.getElementById('navYear')
    const navMonth = document.getElementById('navMonth')
    if (navYear) navYear.textContent = `${this.year}年`
    if (navMonth) navMonth.textContent = MONTH_NAMES[this.month - 1]

    const totalCells = Math.ceil((firstDayIndex + daysInMonth) / DAYS_IN_WEEK) * DAYS_IN_WEEK
    const todayBtnEl = document.querySelector('.today-btn')
    if (todayBtnEl) todayBtnEl.disabled = this.year === this.today.year && this.month === this.today.month

    const cells = []

    for (let i = 0; i < totalCells; i++) {
      let day, month, year, isOtherMonth = false
      if (i < firstDayIndex) {
        day = daysInPrevMonth - firstDayIndex + i + 1
        month = this.month === 1 ? 12 : this.month - 1
        year = this.month === 1 ? this.year - 1 : this.year
        isOtherMonth = true
      } else if (i >= firstDayIndex + daysInMonth) {
        day = i - firstDayIndex - daysInMonth + 1
        month = this.month === 12 ? 1 : this.month + 1
        year = this.month === 12 ? this.year + 1 : this.year
        isOtherMonth = true
      } else {
        day = i - firstDayIndex + 1
        month = this.month
        year = this.year
      }

      const dayIndex = i % 7
      const lunarData = this.computeLunarData(year, month, day)
      const holiday = await this.getHoliday(year, month, day)
      const isCurrentDay = this.isToday(year, month, day)
      const weekend = this.isWeekend(dayIndex)
      const isSelected = this.selectedDate &&
        year === this.selectedDate.year &&
        month === this.selectedDate.month &&
        day === this.selectedDate.day

      let holidayTag = null
      if (holiday) {
        holidayTag = { name: holiday.isWork ? `${holiday.name}（调休）` : holiday.name }
      }

      let lunarDisplay = ''
      if (lunarData) {
        if (lunarData.lunarDay === 1) {
          lunarDisplay = lunarData.lunarMonthStr + '月'
        } else {
          lunarDisplay = lunarData.lunarDayStr
        }
      }

      const dayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      cells.push({
        day, month, year, dayDate, isOtherMonth, isCurrentDay, weekend, isSelected,
        lunarDisplay, lunarData, holidayTag, dayIndex,
      })
    }

    this.hideLoading()
    this.renderGrid(cells)
    if (this.onRender) this.onRender(cells)
  }

  renderGrid(cells) {
    const grid = document.getElementById('calGrid')
    if (!grid) return

    const fragment = document.createDocumentFragment()
    const self = this

    cells.forEach((cell, i) => {
      const el = document.createElement('div')
      el.className = 'cal-cell'
      if (cell.isOtherMonth) el.classList.add('is-other-month')
      if (cell.isCurrentDay) el.classList.add('is-today')
      if (cell.isSelected) el.classList.add('is-selected')
      if (cell.weekend) el.classList.add('is-weekend')
      if (cell.holidayTag) el.classList.add('has-holiday')
      if (cell.lunarData && cell.lunarData.solarTerm) el.classList.add('has-term')
      if (cell.lunarData && cell.lunarData.specialDay) el.classList.add('has-special')

      const dayNum = document.createElement('div')
      dayNum.className = 'day-num'
      dayNum.textContent = cell.day

      const lunar = document.createElement('div')
      lunar.className = 'day-lunar'

      const sp = cell.lunarData?.specialDay
      if (cell.holidayTag) {
        lunar.textContent = cell.holidayTag.name
        lunar.classList.add('lunar-holiday')
      } else if (sp && !cell.lunarData?.solarTerm) {
        lunar.textContent = sp
        lunar.classList.add('lunar-special')
      } else if (cell.lunarData && cell.lunarData.solarTerm) {
        lunar.textContent = cell.lunarData.solarTerm
        lunar.classList.add('lunar-term')
      } else {
        lunar.textContent = cell.lunarDisplay
      }

      const dot = document.createElement('div')
      dot.className = 'day-dot'

      el.appendChild(dayNum)
      el.appendChild(lunar)
      el.appendChild(dot)

      el.dataset.date = cell.dayDate
      el.dataset.year = String(cell.year)
      el.dataset.month = String(cell.month)
      el.dataset.day = String(cell.day)

      el.tabIndex = 0
      el.setAttribute('role', 'button')

      el.addEventListener('click', () => {
        if (self.onDayClick) {
          self.onDayClick(cell)
        }
      })

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (self.onDayClick) {
            self.onDayClick(cell)
          }
        }
      })

      el.style.animationDelay = `${i * 20}ms`

      fragment.appendChild(el)
    })

    grid.innerHTML = ''
    grid.appendChild(fragment)
  }

  goPrevMonth() {
    if (this.month === 1) {
      this.month = 12
      this.year--
    } else {
      this.month--
    }
    this.render()
  }

  prevMonth() { return this.goPrevMonth() }

  goNextMonth() {
    if (this.month === 12) {
      this.month = 1
      this.year++
    } else {
      this.month++
    }
    this.render()
  }

  nextMonth() { return this.goNextMonth() }

  goToday() {
    this.year = this.today.year
    this.month = this.today.month
    this.render()
  }

  setDate(year, month, day) {
    this.selectedDate = { year, month, day }
    this.render()
  }

  showLoading() {
    const loading = document.getElementById('loadingOverlay')
    if (loading) loading.style.display = 'flex'
  }

  hideLoading() {
    const loading = document.getElementById('loadingOverlay')
    if (loading) loading.style.display = 'none'
  }

  init() {
    return this.render()
  }

  refreshEvents() {
    const grid = document.getElementById('calGrid')
    if (!grid) return

    const cells = grid.querySelectorAll('.cal-cell')
    cells.forEach(cell => {
      const date = cell.dataset.date
      const events = window.qingliEvents?.getEvents?.(date) || []
      const dot = cell.querySelector('.day-dot')
      if (dot) {
        dot.style.display = events.length > 0 ? '' : 'none'
      }
    })
  }
}

export { Calendar, categorizeYiji, interpretChongsha, YIJI_EXPLAIN, YIJI_CATEGORIES }

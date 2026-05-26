import { Solar, Lunar } from 'https://esm.sh/lunar-typescript@1.8.6'
import { HolidayService } from './holiday-service.js'

const DAYS_IN_WEEK = 7
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const TRADITIONAL_FESTIVALS = {
  '1/1': '春节', '1/2': '初二', '1/3': '初三', '1/4': '初四', '1/5': '初五',
  '1/15': '元宵节',
  '2/2': '龙抬头',
  '3/3': '上巳节',
  '5/5': '端午节',
  '6/6': '天贶节',
  '7/7': '七夕节',
  '7/15': '中元节',
  '8/15': '中秋节',
  '9/9': '重阳节',
  '10/1': '寒衣节',
  '10/15': '下元节',
  '12/8': '腊八节',
  '12/23': '小年',
  '12/30': '除夕',
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
    } catch (e) {}
  }
}

export class Calendar {
  constructor() {
    const now = new Date()
    this.year = now.getFullYear()
    this.month = now.getMonth() + 1
    this.today = { year: this.year, month: this.month, day: now.getDate() }
    this.selectedDate = null
    this.onDayClick = null
    this.onRender = null
    this.grid = document.getElementById('calGrid')
    this.cachedLunarData = new Map()
    this.holidayService = new HolidayService()
    this.isLoading = false

    this.navYear = document.getElementById('navYear')
    this.navMonth = document.getElementById('navMonth')
    this.prevBtn = document.getElementById('prevMonth')
    this.nextBtn = document.getElementById('nextMonth')
    this.todayBtn = document.getElementById('todayBtn')
  }

  async init() {
    this.prevBtn.addEventListener('click', () => this.prevMonth())
    this.nextBtn.addEventListener('click', () => this.nextMonth())
    this.todayBtn.addEventListener('click', () => this.goToToday())

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prevMonth()
      if (e.key === 'ArrowRight') this.nextMonth()
    })

    await this.render()
  }

  showLoading() {
    this.isLoading = true
    this.grid.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
    `
  }

  hideLoading() {
    this.isLoading = false
  }

  async prevMonth() {
    if (this.month === 1) {
      this.month = 12
      this.year--
    } else {
      this.month--
    }
    await this.render()
  }

  async nextMonth() {
    if (this.month === 12) {
      this.month = 1
      this.year++
    } else {
      this.month++
    }
    await this.render()
  }

  async goToToday() {
    const now = new Date()
    this.year = now.getFullYear()
    this.month = now.getMonth() + 1
    this.selectedDate = this.today
    await this.render()

    const dayCells = this.grid.querySelectorAll('.day-cell')
    for (const cell of dayCells) {
      const day = parseInt(cell.dataset.day)
      if (day === this.today.day) {
        cell.classList.add('spring-bounce')
        setTimeout(() => cell.classList.remove('spring-bounce'), 400)
      }
    }
  }

  getFirstDayOfMonth(year, month) {
    const day = new Date(year, month - 1, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  }

  computeLunarData(year, month, day) {
    const key = `${year}-${month}-${day}`
    if (this.cachedLunarData.has(key)) {
      return this.cachedLunarData.get(key)
    }
    try {
      buildSolarTermCache(this.year)
      const solar = Solar.fromYmd(year, month, day)
      const lunar = solar.getLunar()
      const data = {
        lunarDayStr: lunar.getDayInChinese(),
        lunarMonthStr: lunar.getMonthInChinese(),
        lunarYearStr: lunar.getYearInChinese(),
        shengXiao: lunar.getYearShengXiao(),
        ganZhi: lunar.getYearGanZhi(),
        lunarMonth: lunar.getMonth(),
        lunarDay: lunar.getDay(),
        isLeap: false,
        festival: null,
        solarTerm: null,
      }
      const lunarKey = `${lunar.getMonth()}/${lunar.getDay()}`
      data.festival = TRADITIONAL_FESTIVALS[lunarKey] || null
      const termKey = `${year}-${month}-${day}`
      const term = solarTermCache[termKey]
      if (term) {
        data.solarTerm = term
      }
      this.cachedLunarData.set(key, data)
      return data
    } catch {
      return null
    }
  }

  async getHoliday(year, month, day) {
    try {
      return await this.holidayService.isHoliday(year, month, day)
    } catch {
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

    this.navYear.textContent = `${this.year}年`
    this.navMonth.textContent = MONTH_NAMES[this.month - 1]

    const totalCells = Math.ceil((firstDayIndex + daysInMonth) / DAYS_IN_WEEK) * DAYS_IN_WEEK
    const todayBtnEl = document.querySelector('.today-btn')
    const isCurrentMonth = this.year === this.today.year && this.month === this.today.month
    todayBtnEl.style.opacity = isCurrentMonth ? '0.5' : '1'

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
        const ld = lunarData.lunarDayStr
        lunarDisplay = ld === '初一' ? (lunarData.lunarMonthStr + '月').replace(/^[^\d]*(二十)?/, '') + '月' : ld
        if (lunarData.lunarDay === 1) {
          lunarDisplay = lunarData.lunarMonthStr + '月'
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
    const fragment = document.createDocumentFragment()
    const rows = []
    let currentRow = []

    for (const cell of cells) {
      currentRow.push(cell)
      if (currentRow.length === 7) {
        rows.push(currentRow)
        currentRow = []
      }
    }

    for (const row of rows) {
      for (const cell of row) {
        const el = document.createElement('div')
        el.className = 'day-cell'
        el.dataset.date = cell.dayDate
        el.dataset.day = cell.day
        el.dataset.month = cell.month
        el.dataset.year = cell.year

        if (cell.isOtherMonth) el.classList.add('other-month')
        if (cell.isCurrentDay) el.classList.add('today')
        if (cell.weekend) el.classList.add('weekend')
        if (cell.isSelected) el.classList.add('selected')

        let tagsHtml = ''
        if (cell.holidayTag) {
          tagsHtml += `<span class="day-tag holiday">${cell.holidayTag.name}</span>`
        }
        if (cell.lunarData && cell.lunarData.solarTerm) {
          tagsHtml += `<span class="day-tag solar-term">${cell.lunarData.solarTerm}</span>`
        } else if (cell.lunarData && cell.lunarData.festival && !cell.holidayTag) {
          tagsHtml += `<span class="day-tag festival">${cell.lunarData.festival}</span>`
        }

        el.innerHTML = `
          <div class="day-number">${cell.day}</div>
          ${cell.isCurrentDay ? '<div class="today-seal"></div>' : ''}
          <div class="lunar-date">${cell.lunarDisplay}</div>
          ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
          <div class="event-dots" data-date="${cell.dayDate}"></div>
        `

        el.addEventListener('click', () => {
          if (this.onDayClick) {
            this.onDayClick(cell)
          }
        })

        fragment.appendChild(el)
      }
    }

    this.grid.innerHTML = ''
    this.grid.appendChild(fragment)
  }

  refreshEvents() {
    const eventDotsContainers = this.grid.querySelectorAll('.event-dots')
    if (typeof qingliEvents !== 'undefined' && qingliEvents) {
      for (const container of eventDotsContainers) {
        const date = container.dataset.date
        const events = qingliEvents.getEvents(date)
        if (events.length > 0) {
          const dotColors = [...new Set(events.map(e => e.color || '#5B8F7A'))]
          container.innerHTML = dotColors.map(c =>
            `<span class="event-dot" style="background:${c}"></span>`
          ).join('')
        } else {
          container.innerHTML = ''
        }
      }
    }
  }
}

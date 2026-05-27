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
  '7/7': '七夕节', '7/15': '中元节',
  '8/15': '中秋节',
  '9/9': '重阳节',
  '10/1': '寒衣节', '10/15': '下元节',
  '12/8': '腊八节', '12/23': '小年', '12/30': '除夕',
}

const YIJI_CATEGORIES = {
  '嫁娶': '婚嫁', '纳采': '婚嫁', '订盟': '婚嫁', '纳婿': '婚嫁', '冠笄': '婚嫁',
  '出行': '出行', '旅游': '出行', '移徙': '出行', '入宅': '出行', '赴任': '出行',
  '动土': '营建', '修造': '营建', '上梁': '营建', '安门': '营建', '作灶': '营建',
  '开市': '商务', '交易': '商务', '立契': '商务', '纳财': '商务', '开张': '商务',
  '祭祀': '祭祀', '祈福': '祭祀', '开光': '祭祀', '求嗣': '祭祀', '斋醮': '祭祀',
  '安葬': '丧葬', '启攒': '丧葬', '破土': '丧葬', '行丧': '丧葬',
  '理发': '生活', '沐浴': '生活', '扫舍': '生活', '解除': '生活', '栽种': '生活', '牧养': '生活',
}

const YIJI_EXPLAIN = {
  '嫁娶': '结婚摆酒席', '纳采': '提亲过大礼', '订盟': '订婚仪式', '纳婿': '招女婿上门',
  '出行': '外出远行', '旅游': '观光游览', '移徙': '搬家迁居', '入宅': '入住新居',
  '动土': '开挖地基、装修拆墙', '修造': '动工营造、房屋修缮', '上梁': '建房封顶仪式', '安门': '安装大门',
  '开市': '店铺开业、公司揭牌', '交易': '买卖签约', '立契': '签订合同', '纳财': '进货、收款、投资',
  '祭祀': '拜神、祭祖、扫墓', '祈福': '祈求福运平安', '开光': '神像佛像开光仪式', '求嗣': '求子祈福',
  '安葬': '下葬入土', '启攒': '迁坟、拾骨重葬', '破土': '挖掘墓地',
  '理发': '剪发修面', '沐浴': '沐浴更衣', '扫舍': '打扫房屋', '解除': '解除灾厄',
}

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
    text += `今日与属${zodiac}的人地支相冲。属${zodiac}者大事（签约、出行、婚嫁）宜谨慎。`
  }
  if (direction) {
    text += `煞气在${dirCn}，今日不宜从${dirCn}开始动工或远行。`
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
    } catch (e) {}
  }
}

export { Calendar, categorizeYiji, interpretChongsha, YIJI_EXPLAIN, YIJI_CATEGORIES }

class Calendar {
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

      const yiList = lunar.getDayYi()
      const jiList = lunar.getDayJi()
      const yiGroups = categorizeYiji(yiList)
      const jiGroups = categorizeYiji(jiList)
      const rawChongsha = lunar.getDayChongShu() + ' ' + lunar.getDaySha()
      const chongshaInfo = interpretChongsha(rawChongsha)

      const data = {
        lunarDayStr: lunar.getDayInChinese(),
        lunarMonthStr: lunar.getMonthInChinese(),
        lunarYearStr: lunar.getYearInChinese(),
        shengXiao: lunar.getYearShengXiao(),
        ganZhiYear: lunar.getYearGanZhi(),
        ganZhiMonth: lunar.getMonthGanZhi(),
        ganZhiDay: lunar.getDayGanZhi(),
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
        zhiShen: lunar.getDayZhiXing(),
        naYin: lunar.getDayNaYin(),
        xingXiu: lunar.getDayXiu(),
        xiShen: lunar.getDayXiShen(),
        caiShen: lunar.getDayCaiShen(),
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
    this.updateTodayCard()
    this.updateAiSummary()
    if (this.onRender) this.onRender(cells)
  }

  updateTodayCard() {
    const todayData = this.computeLunarData(this.today.year, this.today.month, this.today.day)
    if (!todayData) return

    const dayEl = document.getElementById('todayCardDay')
    const monthYearEl = document.getElementById('todayCardMonthYear')
    const weekdayEl = document.getElementById('todayCardWeekday')
    const lunarEl = document.getElementById('todayCardLunar')
    const ganzhiEl = document.getElementById('todayCardGanzhi')
    const yiTextEl = document.getElementById('todayCardYiText')
    const jiTextEl = document.getElementById('todayCardJiText')
    const chongshaEl = document.getElementById('todayCardChongsha')

    if (dayEl) dayEl.textContent = this.today.day
    if (monthYearEl) monthYearEl.textContent = `${this.today.month}月 ${this.today.year}`
    if (weekdayEl) {
      const wdNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const wd = new Date(this.today.year, this.today.month - 1, this.today.day).getDay()
      const idx = wd === 0 ? 6 : wd - 1
      weekdayEl.textContent = wdNames[idx]
    }
    if (lunarEl) {
      let lunarText = `农历${todayData.lunarMonthStr}月${todayData.lunarDayStr}`
      if (todayData.solarTerm) lunarText += ` · ${todayData.solarTerm}`
      if (todayData.festival) lunarText += ` · ${todayData.festival}`
      lunarEl.textContent = lunarText
    }
    if (ganzhiEl) {
      ganzhiEl.textContent = `${todayData.ganZhiYear}年 ${todayData.ganZhiMonth}月 ${todayData.ganZhiDay}日 [${todayData.shengXiao}]`
    }
    if (yiTextEl) {
      yiTextEl.textContent = todayData.yi && todayData.yi.length > 0
        ? todayData.yi.slice(0, 6).join('、')
        : '无'
    }
    if (jiTextEl) {
      jiTextEl.textContent = todayData.ji && todayData.ji.length > 0
        ? todayData.ji.slice(0, 5).join('、')
        : '无'
    }
    if (chongshaEl) {
      chongshaEl.textContent = todayData.chongshaInfo.text || ''
      if (!todayData.chongshaInfo.text) {
        chongshaEl.parentElement.style.display = 'none'
      } else {
        chongshaEl.parentElement.style.display = ''
      }
    }
  }

  async updateAiSummary() {
    const aiEl = document.getElementById('todayAiSummary')
    if (!aiEl) return

    const now = new Date()
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
    const cacheKey = 'qingli_ai_summary'
    const cacheRaw = localStorage.getItem(cacheKey)

    if (cacheRaw) {
      try {
        const cache = JSON.parse(cacheRaw)
        if (cache.date === todayKey && cache.summary) {
          aiEl.innerHTML = `<span class="ai-badge">AI</span>${cache.summary}`
          aiEl.style.display = ''
          return
        }
      } catch {}
    }

    try {
      const res = await fetch(`/api/ai-summary?date=${todayKey}`)
      if (!res.ok) throw new Error('API error')

      const data = await res.json()
      const summary = data.summary || ''

      if (summary) {
        const badge = data.generated
          ? '<span class="ai-badge">AI</span>'
          : ''
        aiEl.innerHTML = `${badge}${summary}`
        aiEl.style.display = ''

        localStorage.setItem(cacheKey, JSON.stringify({
          date: todayKey,
          summary: data.generated ? summary : '',
          generated: data.generated,
        }))
      }
    } catch {
      aiEl.style.display = 'none'
    }
  }

  renderGrid(cells) {
    const fragment = document.createDocumentFragment()

    for (const cell of cells) {
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

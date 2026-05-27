import { Solar, Lunar } from 'https://esm.sh/lunar-typescript@1.8.6'
import { HolidayService } from './holiday-service.js'

const DAYS_IN_WEEK = 7
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

// 与 server 端 api/_festivals.js 同步，修改时两边同时更新
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

const SPECIAL_DAYS = {
  '01-01': '元旦',
  '02-14': '情人节', '03-08': '妇女节', '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节', '05-04': '青年节', '05-12': '护士节', '05-20': '520',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '11-11': '双十一',
  '12-24': '平安夜', '12-25': '圣诞节',
}

function getFloatingSpecialDays(year) {
  const pad = (n) => String(n).padStart(2, '0')
  const prefix = `${year}-`
  const days = {}
  const nthWeekday = (month, weekday, n) => {
    const d = new Date(year, month, 1)
    while (d.getDay() !== weekday) d.setDate(d.getDate() + 1)
    d.setDate(d.getDate() + (n - 1) * 7)
    return pad(d.getDate())
  }
  days[prefix + pad(5) + '-' + nthWeekday(4, 0, 2)] = '母亲节'
  days[prefix + pad(6) + '-' + nthWeekday(5, 0, 3)] = '父亲节'
  days[prefix + pad(11) + '-' + nthWeekday(10, 4, 4)] = '感恩节'
  return days
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
  '嫁娶': '结婚摆酒席', '纳采': '提亲过大礼', '订盟': '订婚仪式', '纳婿': '招女婿上门', '冠笄': '成人礼仪式',
  '出行': '外出远行', '旅游': '观光游览', '移徙': '搬家迁居', '入宅': '入住新居', '赴任': '上任履新',
  '动土': '开挖地基、装修拆墙', '修造': '动工营造、房屋修缮', '上梁': '建房封顶仪式', '安门': '安装大门', '作灶': '建灶开火',
  '开市': '店铺开业、公司揭牌', '交易': '买卖签约', '立契': '签订合同', '纳财': '进货、收款、投资', '开张': '新店开张',
  '祭祀': '拜神、祭祖、扫墓', '祈福': '祈求福运平安', '开光': '神像佛像开光仪式', '求嗣': '求子祈福', '斋醮': '设坛做法事',
  '安葬': '下葬入土', '启攒': '迁坟、拾骨重葬', '破土': '挖掘墓地', '行丧': '办理丧事',
  '理发': '剪发修面', '沐浴': '沐浴更衣', '扫舍': '打扫房屋', '解除': '解除灾厄', '栽种': '种植花草、植树', '牧养': '放牧养殖',
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
    this.updateTodayCard()
    this.updateAiSummary()
    if (this.onRender) this.onRender(cells)
  }

  updateTodayCard() {
    const todayData = this.computeLunarData(this.today.year, this.today.month, this.today.day)
    if (!todayData) return
    const wdNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const wd = new Date(this.today.year, this.today.month - 1, this.today.day).getDay()

    const yearLineEl = document.getElementById('todayYearLine')
    if (yearLineEl) {
      yearLineEl.textContent = `${this.today.year}年  ${todayData.ganZhiYear}年 · ${todayData.shengXiao}`
    }

    const dateHeadEl = document.getElementById('todayCardDateHead')
    if (dateHeadEl) {
      const extra = []
      if (todayData.solarTerm) extra.push(todayData.solarTerm)
      if (todayData.festival) extra.push(todayData.festival)
      if (todayData.specialDay) extra.push(todayData.specialDay)
      const extraStr = extra.length > 0 ? `  ·  ${extra.join(' · ')}` : ''
      dateHeadEl.textContent = `${this.today.month}月${this.today.day}日  ${wdNames[wd]}${extraStr}`
    }

    const clockEl = document.getElementById('todayClock')
    if (clockEl) {
      const now = new Date()
      clockEl.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      if (!this._clockInterval) {
        this._clockInterval = setInterval(() => {
          const c = document.getElementById('todayClock')
          if (c) c.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }, 10000)
      }
    }

    const lunarLineEl = document.getElementById('todayCardLunarLine')
    if (lunarLineEl) {
      lunarLineEl.textContent = `农历${todayData.lunarMonthStr}月${todayData.lunarDayStr}  |  ${todayData.ganZhiYear}年 · ${todayData.ganZhiMonth}月 · ${todayData.ganZhiDay}日`
    }

    const yiSectionEl = document.getElementById('todayYiSection')
    if (yiSectionEl) {
      if (todayData.yi && todayData.yi.length > 0) {
        const topYi = todayData.yi.slice(0, 6)
        const tags = topYi.map((t, i) => {
          const explain = YIJI_EXPLAIN[t] || ''
          const title = explain ? ` title="${explain}"` : ''
          return `<span class="yi-ji-tag yi-tag"${title}>${t}</span>`
        }).join('')
        const explainText = this._buildYiExplain(topYi)
        yiSectionEl.innerHTML = `<div class="yi-ji-block yi-block">
          <div class="yi-ji-header yi-header">宜</div>
          <div class="yi-ji-tags">${tags}</div>
          <p class="yi-ji-explain yi-explain-text">${explainText}</p>
        </div>`
      } else {
        yiSectionEl.innerHTML = `<div class="yi-ji-block yi-block">
          <div class="yi-ji-header yi-header">宜</div>
          <p class="yi-ji-explain yi-explain-text" style="color:var(--color-text-muted)">今日无特别宜事，随心而动即可。</p>
        </div>`
      }
    }

    const jiSectionEl = document.getElementById('todayJiSection')
    if (jiSectionEl) {
      if (todayData.ji && todayData.ji.length > 0) {
        const topJi = todayData.ji.slice(0, 5)
        const tags = topJi.map((t, i) => {
          const explain = YIJI_EXPLAIN[t] || ''
          const title = explain ? ` title="${explain}"` : ''
          return `<span class="yi-ji-tag ji-tag"${title}>${t}</span>`
        }).join('')
        const explainText = this._buildJiExplain(topJi)
        jiSectionEl.innerHTML = `<div class="yi-ji-block ji-block">
          <div class="yi-ji-header ji-header">忌</div>
          <div class="yi-ji-tags">${tags}</div>
          <p class="yi-ji-explain ji-explain-text">${explainText}</p>
        </div>`
      } else {
        jiSectionEl.innerHTML = `<div class="yi-ji-block ji-block">
          <div class="yi-ji-header ji-header">忌</div>
          <p class="yi-ji-explain ji-explain-text" style="color:var(--color-text-muted)">百无禁忌，今日诸事可行。</p>
        </div>`
      }
    }

    const chongshaSectionEl = document.getElementById('todayChongshaSection')
    if (chongshaSectionEl) {
      const ci = todayData.chongshaInfo
      if (ci && ci.text) {
        let chongName = todayData.chongSha || ''
        let explain = ''
        if (ci.zodiac) {
          explain += `今日冲${ci.zodiac}，属${ci.zodiac}的朋友大事多留个心眼——签约付款、远行搬家，能缓则缓。`
        }
        if (ci.direction) {
          explain += `煞气落于${ci.direction}方，动土修造忌朝此向。`
        }
        chongshaSectionEl.innerHTML = `<div class="yi-ji-block chongsha-block">
          <div class="yi-ji-header chongsha-header">冲</div>
          <div class="yi-ji-tags"><span class="yi-ji-tag chongsha-tag">${chongName}</span></div>
          <p class="yi-ji-explain chongsha-explain-text">${explain}</p>
        </div>`
        chongshaSectionEl.style.display = ''
      } else {
        chongshaSectionEl.style.display = 'none'
      }
    }

    const metaSectionEl = document.getElementById('todayMetaSection')
    if (metaSectionEl) {
      const parts = []
      if (todayData.zhiShen) parts.push(`值神 ${todayData.zhiShen}`)
      if (todayData.xiShen) parts.push(`喜神 ${todayData.xiShen}`)
      if (todayData.caiShen) parts.push(`财神 ${todayData.caiShen}`)
      metaSectionEl.textContent = parts.length > 0 ? parts.join('  ·  ') : ''
    }
  }

  _buildYiExplain(terms) {
    const explains = terms.map(t => YIJI_EXPLAIN[t] || '').filter(Boolean)
    const joined = explains.slice(0, 4).join('、')
    const wordCount = terms.length

    const openers = [
      `${terms.slice(0, 3).join('、')} 一类事务，${joined}，今天都挺合适。`,
      `今日宜${terms.slice(0, 2).join('、')}，${joined}——星象上看是个好日子。`,
      `${joined}，所以${terms.slice(0, 3).join('、')}尽管放手去做。`,
      `讲究的人会选今天${terms[0]}，${explains[0] || ''}，时辰和方位都对。`,
    ]

    if (wordCount <= 2) {
      return `${terms.join('和')}都和今天的气场对得上，顺水推舟的好时机。`
    }

    if (wordCount >= 5) {
      return `今天日子不错：${terms.slice(0, 4).join('、')}等均宜。${explains[0] || ''}，天时地利，别浪费了。`
    }

    return openers[wordCount % openers.length]
  }

  _buildJiExplain(terms) {
    const explains = terms.map(t => YIJI_EXPLAIN[t] || '').filter(Boolean)
    const wordCount = terms.length

    const closers = [
      `今日忌${terms.slice(0, 3).join('、')}。${explains[0] || ''}，避开不亏。`,
      `按老黄历，${terms[0]}之类的事别在今天办——${explains[0] || '时辰不吉'}。`,
      `${explains.slice(0, 2).join('，')}，这几样不碰为妙。`,
      `今天气场不太支持${terms[0]}，缓一缓，不着急。`,
    ]

    if (wordCount <= 2) {
      return `${terms.join('和')}今天不太合适，不急的话改天挑个吉日。`
    }

    return closers[wordCount % closers.length]
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
    const grid = document.getElementById('calGrid')
    if (!grid) return

    const fragment = document.createDocumentFragment()
    const self = this

    for (const cell of cells) {
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

      fragment.appendChild(el)
    }

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

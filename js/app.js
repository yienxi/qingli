import { Calendar } from './calendar.js'
import { EventStore } from './events.js'

const cal = new Calendar()
const eventStore = new EventStore()

let selectedCell = null
let isPanelOpen = false
let touchStartX = 0
let touchEndX = 0

const detailOverlay = document.getElementById('detailOverlay')
const detailPanel = document.getElementById('detailPanel')
const panelDate = document.getElementById('panelDate')
const panelLunar = document.getElementById('panelLunar')
const panelTags = document.getElementById('panelTags')
const panelYi = document.getElementById('panelYi')
const panelJi = document.getElementById('panelJi')
const panelChongsha = document.getElementById('panelChongsha')
const panelZhishen = document.getElementById('panelZhishen')
const panelNayin = document.getElementById('panelNayin')
const panelXingxiu = document.getElementById('panelXingxiu')
const panelXishen = document.getElementById('panelXishen')
const panelCaishen = document.getElementById('panelCaishen')
const panelEvents = document.getElementById('panelEvents')
const eventForm = document.getElementById('eventForm')
const eventTitleInput = document.getElementById('eventTitleInput')
const eventTimeInput = document.getElementById('eventTimeInput')
const eventColorInput = document.getElementById('eventColorInput')
const panelCloseBtn = document.getElementById('panelCloseBtn')
const toast = document.getElementById('toast')
const themeToggle = document.getElementById('themeToggle')
const themeIcon = document.getElementById('themeIcon')

window.qingliEvents = eventStore

function showToast(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2000)
}

function openPanel(cellData) {
  selectedCell = cellData
  isPanelOpen = true
  const dateStr = cellData.dayDate

  panelDate.textContent = `${cellData.year}年${cellData.month}月${cellData.day}日`

  const lunarInfo = cellData.lunarData
  if (lunarInfo) {
    let lunarText = `农历${lunarInfo.lunarMonthStr}月${lunarInfo.lunarDayStr} · ${lunarInfo.ganZhiYear}年[${lunarInfo.shengXiao}]`
    lunarText += ` · ${lunarInfo.ganZhiMonth}月 ${lunarInfo.ganZhiDay}日`
    panelLunar.textContent = lunarText
  } else {
    panelLunar.textContent = ''
  }

  let tagsHtml = ''
  if (cellData.holidayTag) {
    tagsHtml += `<span class="day-tag holiday">${cellData.holidayTag.name}</span>`
  }
  if (lunarInfo && lunarInfo.solarTerm) {
    tagsHtml += `<span class="day-tag solar-term">${lunarInfo.solarTerm}</span>`
  }
  if (lunarInfo && lunarInfo.festival) {
    tagsHtml += `<span class="day-tag festival">${lunarInfo.festival}</span>`
  }
  panelTags.innerHTML = tagsHtml

  if (lunarInfo) {
    if (panelYi) {
      panelYi.textContent = lunarInfo.yi && lunarInfo.yi.length > 0
        ? lunarInfo.yi.join('、')
        : '无'
    }
    if (panelJi) {
      panelJi.textContent = lunarInfo.ji && lunarInfo.ji.length > 0
        ? lunarInfo.ji.join('、')
        : '无'
    }
    if (panelChongsha) panelChongsha.textContent = lunarInfo.chongSha || '-'
    if (panelZhishen) panelZhishen.textContent = lunarInfo.zhiShen || '-'
    if (panelNayin) panelNayin.textContent = lunarInfo.naYin || '-'
    if (panelXingxiu) panelXingxiu.textContent = lunarInfo.xingXiu || '-'
    if (panelXishen) panelXishen.textContent = lunarInfo.xiShen || '-'
    if (panelCaishen) panelCaishen.textContent = lunarInfo.caiShen || '-'
  }

  renderEventsForDate(dateStr)
  eventTitleInput.value = ''
  eventTimeInput.value = ''
  eventForm.dataset.date = dateStr

  detailOverlay.classList.add('open')
  detailPanel.classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closePanel() {
  isPanelOpen = false
  detailOverlay.classList.remove('open')
  detailPanel.classList.remove('open')
  document.body.style.overflow = ''
}

function renderEventsForDate(dateStr) {
  const events = eventStore.getEvents(dateStr)
  if (events.length === 0) {
    panelEvents.innerHTML = '<div style="color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-2) 0;">暂无事件</div>'
    return
  }

  panelEvents.innerHTML = events.map(e => `
    <div class="event-item" data-id="${e.id}">
      <span class="event-color" style="background:${e.color}"></span>
      <span class="event-item-title">${escapeHtml(e.title)}</span>
      ${e.time ? `<span class="event-item-time">${e.time}</span>` : ''}
      <button class="event-delete" data-id="${e.id}" aria-label="删除事件">✕</button>
    </div>
  `).join('')

  panelEvents.querySelectorAll('.event-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.id
      eventStore.deleteEvent(id)
      const dateStr = eventForm.dataset.date
      renderEventsForDate(dateStr)
      cal.refreshEvents()
      showToast('事件已删除')
    })
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

eventForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const title = eventTitleInput.value.trim()
  if (!title) return

  const dateStr = eventForm.dataset.date
  eventStore.addEvent({
    date: dateStr,
    title,
    time: eventTimeInput.value,
    color: eventColorInput.value,
  })

  renderEventsForDate(dateStr)
  cal.refreshEvents()
  eventTitleInput.value = ''
  showToast('事件已添加')
})

detailOverlay.addEventListener('click', closePanel)
panelCloseBtn.addEventListener('click', closePanel)

cal.onDayClick = (cellData) => {
  if (cellData.isOtherMonth) {
    cal.year = cellData.year
    cal.month = cellData.month
    cal.render()
  }
  openPanel(cellData)
}

cal.onRender = () => {
  cal.refreshEvents()
}

const grid = document.getElementById('calGrid')
grid.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX
}, { passive: true })

grid.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}, { passive: true })

function handleSwipe() {
  const threshold = 60
  const diff = touchStartX - touchEndX
  if (Math.abs(diff) > threshold) {
    if (diff > 0) {
      cal.nextMonth()
    } else {
      cal.prevMonth()
    }
  }
}

function getBaseUrl() {
  return window.location.origin
}

function setupIcalLinks() {
  const baseUrl = getBaseUrl()
  const types = {
    all: '全部日历（节假日+农历+节气）',
    holidays: '中国法定节假日',
    lunar: '农历节日',
    terms: '二十四节气',
  }

  for (const [type, label] of Object.entries(types)) {
    const urlEl = document.getElementById(`icalUrl${type.charAt(0).toUpperCase() + type.slice(1)}`)
    const copyBtn = document.querySelector(`.copy-btn[data-type="${type}"]`)
    if (urlEl) {
      const url = `${baseUrl}/api/ical?type=${type}`
      urlEl.textContent = url
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const url = `${baseUrl}/api/ical?type=${type}`
        try {
          await navigator.clipboard.writeText(url)
          copyBtn.textContent = '已复制 ✓'
          copyBtn.classList.add('copied')
          setTimeout(() => {
            copyBtn.textContent = '复制'
            copyBtn.classList.remove('copied')
          }, 2000)
          showToast(`${label} 链接已复制`)
        } catch {
          showToast('复制失败，请手动复制')
        }
      })
    }
  }
}

let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
const savedTheme = localStorage.getItem('qingli_theme')
if (savedTheme) {
  darkMode = savedTheme === 'dark'
}
applyTheme()

themeToggle.addEventListener('click', () => {
  darkMode = !darkMode
  localStorage.setItem('qingli_theme', darkMode ? 'dark' : 'light')
  applyTheme()
})

function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  themeIcon.textContent = darkMode ? '☾' : '☀'
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.content = darkMode ? '#1C1814' : '#F7F3EE'
  }
}

setupIcalLinks()

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isPanelOpen) {
    closePanel()
  }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js').catch(() => {})
  })
}

function setupVersionDisplay() {
  const versionEl = document.getElementById('dataVersion')
  const versionNumberEl = document.getElementById('versionNumber')

  if (cal.holidayService.dataVersion) {
    versionNumberEl.textContent = cal.holidayService.dataVersion
    versionEl.style.display = 'flex'
  }

  setTimeout(() => {
    if (cal.holidayService.updateAvailable) {
      showToast('节假日数据已更新')
    }
  }, 1000)
}

const searchBtn = document.getElementById('searchBtn')
const searchPanel = document.getElementById('searchPanel')
const searchInput = document.getElementById('searchInput')
const searchResults = document.getElementById('searchResults')

let isSearchOpen = false

searchBtn.addEventListener('click', () => {
  isSearchOpen = !isSearchOpen
  searchPanel.style.display = isSearchOpen ? 'block' : 'none'
  if (isSearchOpen) {
    searchInput.focus()
  }
})

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase()
  if (!query) {
    searchResults.innerHTML = ''
    return
  }

  const allEvents = eventStore.getAllEvents()
  const matches = allEvents.filter(e =>
    e.title.toLowerCase().includes(query)
  ).sort((a, b) => a.date.localeCompare(b.date))

  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="search-results empty">未找到匹配的事件</div>'
    return
  }

  searchResults.innerHTML = matches.map(e => {
    const [year, month, day] = e.date.split('-')
    return `
      <div class="search-result-item" data-date="${e.date}">
        <span class="event-color" style="background:${e.color}"></span>
        <div class="event-info">
          <div class="event-title">${escapeHtml(e.title)}</div>
          <div class="event-date">${year}年${parseInt(month)}月${parseInt(day)}日${e.time ? ` ${e.time}` : ''}</div>
        </div>
      </div>
    `
  }).join('')

  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const date = item.dataset.date
      const [year, month, day] = date.split('-').map(Number)
      cal.year = year
      cal.month = month
      cal.render().then(() => {
        isSearchOpen = false
        searchPanel.style.display = 'none'
        searchInput.value = ''

        const cell = document.querySelector(`[data-date="${date}"]`)
        if (cell) {
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' })
          cell.classList.add('selected')
        }
      })
    })
  })
})

cal.init().then(() => {
  setupVersionDisplay()
}).catch(console.error)

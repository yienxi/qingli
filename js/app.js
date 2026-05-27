import { Calendar, categorizeYiji, interpretChongsha, YIJI_EXPLAIN, YIJI_CATEGORIES } from './calendar.js'
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
const panelYiGroups = document.getElementById('panelYiGroups')
const panelJiGroups = document.getElementById('panelJiGroups')
const panelChongshaBlock = document.getElementById('panelChongshaBlock')
const panelChongshaRaw = document.getElementById('panelChongshaRaw')
const panelChongshaText = document.getElementById('panelChongshaText')
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
const panelShareBtn = document.getElementById('panelShareBtn')
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

function buildYijiGroupHtml(yiGroups, jiGroups) {
  const catOrder = ['婚嫁', '出行', '营建', '商务', '祭祀', '生活', '丧葬', '其他']

  function buildCol(groups) {
    if (!groups || Object.keys(groups).length === 0) {
      return '<div class="yiji-category-item"><span class="yiji-cat-terms"><span class="yiji-term" style="color:var(--color-text-muted)">无</span></span></div>'
    }

    return catOrder
      .filter(cat => groups[cat] && groups[cat].length > 0)
      .map(cat => {
        const terms = groups[cat]
        const termHtml = terms.slice(0, 5).map(term => {
          const explain = YIJI_EXPLAIN[term] || ''
          const tooltip = explain ? `<span class="yiji-term-tooltip">${explain}</span>` : ''
          return `<span class="yiji-term">${term}${tooltip}</span>`
        }).join('')
        return `<div class="yiji-category-item">
          <span class="yiji-cat-name">${cat}</span>
          <span class="yiji-cat-terms">${termHtml}</span>
        </div>`
      }).join('')
  }

  const yiCol = buildCol(yiGroups)
  const jiCol = buildCol(jiGroups)

  if (panelYiGroups) panelYiGroups.innerHTML = yiCol || ''
  if (panelJiGroups) panelJiGroups.innerHTML = jiCol || ''
}

function openPanel(cellData) {
  selectedCell = cellData
  isPanelOpen = true
  const dateStr = cellData.dayDate

  panelDate.textContent = `${cellData.year}年${cellData.month}月${cellData.day}日`

  const lunarInfo = cellData.lunarData
  if (lunarInfo) {
    let lunarText = `农历${lunarInfo.lunarMonthStr}月${lunarInfo.lunarDayStr}`
    if (lunarInfo.solarTerm) lunarText += ` · ${lunarInfo.solarTerm}`
    if (lunarInfo.festival) lunarText += ` · ${lunarInfo.festival}`
    lunarText += `\n${lunarInfo.ganZhiYear}年 [${lunarInfo.shengXiao}] ${lunarInfo.ganZhiMonth}月 ${lunarInfo.ganZhiDay}日`
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
  if (lunarInfo && lunarInfo.specialDay) {
    tagsHtml += `<span class="day-tag special">${lunarInfo.specialDay}</span>`
  }
  panelTags.innerHTML = tagsHtml

  if (lunarInfo) {
    buildYijiGroupHtml(lunarInfo.yiGroups, lunarInfo.jiGroups)

    if (lunarInfo.chongshaInfo && lunarInfo.chongshaInfo.text) {
      if (panelChongshaRaw) panelChongshaRaw.textContent = lunarInfo.chongSha || ''
      if (panelChongshaText) panelChongshaText.textContent = lunarInfo.chongshaInfo.text
      if (panelChongshaBlock) panelChongshaBlock.style.display = ''
    } else {
      if (panelChongshaBlock) panelChongshaBlock.style.display = 'none'
    }

    if (panelZhishen) panelZhishen.textContent = lunarInfo.zhiShen || '-'
    if (panelNayin) panelNayin.textContent = lunarInfo.naYin || '-'
    if (panelXingxiu) panelXingxiu.textContent = lunarInfo.xingXiu || '-'
    if (panelXishen) panelXishen.textContent = lunarInfo.xiShen || '-'
    if (panelCaishen) panelCaishen.textContent = lunarInfo.caiShen || '-'
  } else {
    if (panelYiGroups) panelYiGroups.innerHTML = '<div class="yiji-category-item"><span class="yiji-term" style="color:var(--color-text-muted)">暂无数据</span></div>'
    if (panelJiGroups) panelJiGroups.innerHTML = '<div class="yiji-category-item"><span class="yiji-term" style="color:var(--color-text-muted)">暂无数据</span></div>'
    if (panelChongshaBlock) panelChongshaBlock.style.display = 'none'
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
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

  document.querySelectorAll('.ical-card-url').forEach(el => {
    const type = el.dataset.url
    const url = `${baseUrl}/api/ical?type=${type}`
    el.textContent = url
  })

  document.querySelectorAll('.ical-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type
      const url = `${baseUrl}/api/ical?type=${type}`
      try {
        if (!navigator.clipboard) {
          const ta = document.createElement('textarea')
          ta.value = url
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        } else {
          await navigator.clipboard.writeText(url)
        }
        btn.textContent = '已复制 ✓'
        btn.classList.add('copied')
        setTimeout(() => {
          btn.textContent = '复制链接'
          btn.classList.remove('copied')
        }, 2000)
        showToast('iCal 链接已复制到剪贴板')
      } catch {
        showToast('复制失败，请手动复制')
      }
    })
  })
}

setupIcalLinks()

document.getElementById('prevMonth').addEventListener('click', () => cal.prevMonth())
document.getElementById('nextMonth').addEventListener('click', () => cal.nextMonth())
document.getElementById('todayBtn').addEventListener('click', () => cal.goToday())

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

let deferredPrompt = null
const pwaInstallBanner = document.getElementById('pwaInstallBanner')
const pwaInstallBtn = document.getElementById('pwaInstallBtn')
const pwaDismissBtn = document.getElementById('pwaDismissBtn')

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e

  if (localStorage.getItem('qingli_pwa_banner_dismissed')) return

  setTimeout(() => {
    if (pwaInstallBanner) pwaInstallBanner.style.display = 'flex'
  }, 2000)
})

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    deferredPrompt = null

    if (pwaInstallBanner) pwaInstallBanner.style.display = 'none'

    if (result.outcome === 'accepted') {
      showToast('已添加到桌面')
    }
  })
}

if (pwaDismissBtn) {
  pwaDismissBtn.addEventListener('click', () => {
    localStorage.setItem('qingli_pwa_banner_dismissed', '1')
    if (pwaInstallBanner) pwaInstallBanner.style.display = 'none'
  })
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  if (pwaInstallBanner) pwaInstallBanner.style.display = 'none'
})

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
  if (!localStorage.getItem('qingli_bookmark_hint_shown')) {
    setTimeout(() => {
      showToast('按 Ctrl+D 收藏，随时打开看黄历')
      localStorage.setItem('qingli_bookmark_hint_shown', '1')
    }, 8000)
  }
}).catch(console.error)

if (panelShareBtn) {
  panelShareBtn.addEventListener('click', generateShareCard)
}

async function generateShareCard() {
  const d = selectedCell
  if (!d) return

  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const bg = isDark ? '#2D2A24' : '#F7F3EE'
  const fg = isDark ? '#E8E0D4' : '#3C3024'
  const accent = '#B54A3A'
  const muted = isDark ? '#A09884' : '#8C7C6C'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.font = 'bold 96px "Noto Serif SC", "Source Han Serif CN", serif'
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.fillText(`${d.month}月${d.day}日`, W / 2, 220)

  ctx.font = '36px "Noto Sans SC", sans-serif'
  ctx.fillStyle = muted
  ctx.fillText(`${d.year}年`, W / 2, 290)

  let y = 400
  if (d.lunarData) {
    const li = d.lunarData
    ctx.font = '40px "Noto Sans SC", sans-serif'
    ctx.fillStyle = fg
    const lunarLine = `农历${li.lunarMonthStr}月${li.lunarDayStr}`
    ctx.fillText(lunarLine, W / 2, y); y += 60
    ctx.font = '32px "Noto Sans SC", sans-serif'
    ctx.fillStyle = muted
    ctx.fillText(`${li.ganZhiYear}年 · ${li.shengXiao} · ${li.ganZhiMonth}月 · ${li.ganZhiDay}日`, W / 2, y); y += 60
    if (li.solarTerm || li.festival) {
      ctx.fillStyle = accent
      ctx.fillText([li.solarTerm, li.festival].filter(Boolean).join(' · '), W / 2, y); y += 60
    }
    y += 20

    const allYi = Object.values(li.yiGroups || {}).flat()
    const allJi = Object.values(li.jiGroups || {}).flat()
    if (allYi.length > 0 || allJi.length > 0) {
      ctx.font = 'bold 36px "Noto Sans SC", sans-serif'
      if (allYi.length > 0) {
        ctx.fillStyle = '#358A50'
        ctx.textAlign = 'left'
        ctx.fillText('宜', 160, y); y += 50
        ctx.font = '32px "Noto Sans SC", sans-serif'
        ctx.fillStyle = fg
        ctx.textAlign = 'left'
        const parts = []
        for (let i = 0; i < allYi.length && i < 8; i++) {
          parts.push(YIJI_EXPLAIN[allYi[i]] || allYi[i])
        }
        ctx.fillText(parts.join('  ·  '), 160, y); y += 60
        ctx.font = 'bold 36px "Noto Sans SC", sans-serif'
      }
      if (allJi.length > 0) {
        ctx.fillStyle = accent
        ctx.textAlign = 'left'
        ctx.fillText('忌', 160, y); y += 50
        ctx.font = '32px "Noto Sans SC", sans-serif'
        ctx.fillStyle = muted
        ctx.textAlign = 'left'
        const parts = []
        for (let i = 0; i < allJi.length && i < 8; i++) {
          parts.push(YIJI_EXPLAIN[allJi[i]] || allJi[i])
        }
        ctx.fillText(parts.join('  ·  '), 160, y); y += 60
      }
    }
  }

  y = Math.max(y + 60, 920)
  ctx.font = '28px "Noto Sans SC", sans-serif'
  ctx.fillStyle = muted
  ctx.textAlign = 'center'
  ctx.fillText('轻历 · qingli.app', W / 2, y)

  try {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    if (navigator.share) {
      await navigator.share({
        title: '轻历',
        text: `${d.month}月${d.day}日 · 农历宜忌`,
        files: [new File([blob], `qingli-${d.dayDate}.png`, { type: 'image/png' })]
      })
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `qingli-${d.dayDate}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      showToast('卡片已保存')
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('Share failed:', e)
  }
}
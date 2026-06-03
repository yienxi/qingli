import { Calendar, categorizeYiji, interpretChongsha, YIJI_EXPLAIN, YIJI_CATEGORIES } from './calendar.js'
import { EventStore } from './events.js'
import { QINGLI_CONFIG } from './config.js'
import { initAmbientCanvas } from './ambient.js'

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
const magazineHeadline = document.getElementById('magazineHeadline')
const magazineSubline = document.getElementById('magazineSubline')
const magazineDate = document.getElementById('magazineDate')
const magazineFocusTags = document.getElementById('magazineFocusTags')
const magazineWarningTags = document.getElementById('magazineWarningTags')
const magazineChongsha = document.getElementById('magazineChongsha')
const magazineLunarBar = document.getElementById('magazineLunarBar')
const magazineAiNote = document.getElementById('magazineAiNote')
const jumpTodayBtn = document.getElementById('jumpTodayBtn')
const shareWorkdayBtn = document.getElementById('shareWorkdayBtn')
const icalToggle = document.getElementById('icalToggle')
const icalContent = document.getElementById('icalContent')

let currentWorkdayBrief = null
let activeCardDate = {
  year: cal.today.year,
  month: cal.today.month,
  day: cal.today.day,
}

window.qingliEvents = eventStore

function showToast(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2000)
}

const YI_TO_WORK = {
  交易: '谈条件',
  开市: '开新坑',
  立券: '签确认',
  纳财: '谈预算',
  出行: '外出办事',
  赴任: '接新任务',
  祈福: '稳心态',
  解除: '清旧账',
  修造: '修流程',
  动土: '动项目',
  入宅: '换环境',
  移徙: '调安排',
}

const JI_TO_WORK = {
  交易: '别急签字',
  开市: '慎开新坑',
  立券: '别空口承诺',
  出行: '少跑动',
  动土: '慎动架构',
  修造: '少改流程',
  嫁娶: '少做绑定',
  安葬: '别翻旧账',
  赴任: '慎接大活',
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))]
}

function mapTraditionalTerms(terms, dictionary, fallback) {
  const mapped = uniqueList((terms || []).map(term => dictionary[term]))
  return uniqueList([...mapped, ...fallback]).slice(0, 4)
}

function getDateMeta(lunarData, dateParts = activeCardDate) {
  const date = new Date(dateParts.year, dateParts.month - 1, dateParts.day)
  const weekday = date.getDay()
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const markers = []
  if (lunarData?.solarTerm) markers.push(lunarData.solarTerm)
  if (lunarData?.festival) markers.push(lunarData.festival)
  if (lunarData?.specialDay) markers.push(lunarData.specialDay)
  return {
    weekday,
    weekdayName: weekdayNames[weekday],
    isWeekend: weekday === 0 || weekday === 6,
    isMonday: weekday === 1,
    isFriday: weekday === 5,
    markers,
  }
}

function isTodayDate(date) {
  return date.year === cal.today.year && date.month === cal.today.month && date.day === cal.today.day
}

function buildDateSummary({ date, lunarData, holidayTag }) {
  const meta = getDateMeta(lunarData, date)
  const yiFocus = mapTraditionalTerms(lunarData?.yi, YI_TO_WORK, ['查清安排', '整理节奏', '轻量推进', '留好余地'])
  const jiWarnings = mapTraditionalTerms(lunarData?.ji, JI_TO_WORK, ['临时拍板', '空口承诺', '过度消耗', '硬凑热闹'])
  const markers = []
  if (holidayTag?.name) markers.push(holidayTag.name)
  markers.push(...meta.markers)

  const dateLine = `${date.month}月${date.day}日 ${meta.weekdayName}`
  const lunarLine = lunarData
    ? `农历${lunarData.lunarMonthStr}月${lunarData.lunarDayStr} · ${lunarData.ganZhiYear}年 · ${lunarData.shengXiao}`
    : ''
  const markerText = markers.length > 0 ? `今天有 ${markers.join(' · ')}，日程别排太满。` : ''
  const weekdayText = meta.isWeekend
    ? '适合把节奏放慢一点，别让休息也像任务。'
    : meta.isFriday
      ? '适合收尾和确认边界，新坑可以先别急着开。'
      : meta.isMonday
        ? '适合先排优先级，别一上来就把整周塞满。'
        : '适合稳稳推进，把重要的小事先做清楚。'
  const headline = markerText || weekdayText
  const subline = `宜忌来自传统黄历，轻历只负责翻译成人话。`
  const chongsha = lunarData?.chongshaInfo?.text
    ? `${lunarData.chongSha || '冲煞'} · ${lunarData.chongshaInfo.text}`
    : ''

  return {
    headline,
    subline,
    focus: yiFocus,
    warning: jiWarnings,
    dateLine,
    lunarLine,
    chongsha,
    markers,
    date,
    lunarData,
  }
}

async function renderWorkdayCard(date = activeCardDate, sourceCell = null) {
  activeCardDate = date
  const lunarData = sourceCell?.lunarData || cal.computeLunarData(date.year, date.month, date.day)
  const holidayTag = sourceCell?.holidayTag || await cal.getHoliday(date.year, date.month, date.day)
  const summary = buildDateSummary({ date, lunarData, holidayTag })
  currentWorkdayBrief = summary

  if (magazineDate) magazineDate.textContent = `${summary.dateLine}${isTodayDate(date) ? '' : ' · 已选'}`
  if (magazineLunarBar) magazineLunarBar.textContent = summary.lunarLine

  if (magazineHeadline) {
    magazineHeadline.textContent = summary.headline
    magazineHeadline.classList.remove('is-loading')
  }
  if (magazineSubline) magazineSubline.textContent = summary.subline
  if (magazineFocusTags) {
    magazineFocusTags.innerHTML = summary.focus.map(item => `<span>${escapeHtml(item)}</span>`).join('')
  }
  if (magazineWarningTags) {
    magazineWarningTags.innerHTML = summary.warning.map(item => `<span>${escapeHtml(item)}</span>`).join('')
  }
  if (magazineChongsha) {
    magazineChongsha.textContent = summary.chongsha
    magazineChongsha.style.display = summary.chongsha ? '' : 'none'
  }
  if (magazineAiNote) {
    magazineAiNote.textContent = QINGLI_CONFIG.aiSummary
      ? 'AI 摘要已开启，基础日期信息仍由轻历算法提供'
      : '同一日期内容固定，切换日期才会更新'
  }
  if (jumpTodayBtn) jumpTodayBtn.hidden = isTodayDate(date)

  if (!QINGLI_CONFIG.aiSummary) return

  try {
    const dateParam = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
    const res = await fetch(`/api/ai-summary?date=${dateParam}`)
    const data = await res.json()
    if (data.summary && magazineHeadline) {
      magazineHeadline.textContent = data.summary
      currentWorkdayBrief.headline = data.summary
    }
  } catch (e) {
    console.warn('AI summary fetch failed:', e)
  }
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
}

function closePanel() {
  isPanelOpen = false
  detailOverlay.classList.remove('open')
  detailPanel.classList.remove('open')
}

function markSelectedDate(dateStr) {
  document.querySelectorAll('.cal-cell.is-selected').forEach(cell => cell.classList.remove('is-selected'))
  const cell = document.querySelector(`.cal-cell[data-date="${dateStr}"]`)
  if (cell) cell.classList.add('is-selected')
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isPanelOpen) closePanel() })

cal.onDayClick = (cellData) => {
  if (cellData.isOtherMonth) {
    cal.year = cellData.year
    cal.month = cellData.month
    cal.render()
  }
  cal.selectedDate = { year: cellData.year, month: cellData.month, day: cellData.day }
  renderWorkdayCard({ year: cellData.year, month: cellData.month, day: cellData.day }, cellData)
  markSelectedDate(cellData.dayDate)
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

if (icalToggle && icalContent) {
  const expanded = !QINGLI_CONFIG.icalSectionCollapsed
  icalContent.hidden = !expanded
  icalToggle.setAttribute('aria-expanded', String(expanded))
  icalToggle.querySelector('.ical-toggle-icon').textContent = expanded ? '−' : '+'
  icalToggle.addEventListener('click', () => {
    const nextExpanded = icalContent.hidden
    icalContent.hidden = !nextExpanded
    icalToggle.setAttribute('aria-expanded', String(nextExpanded))
    icalToggle.querySelector('.ical-toggle-icon').textContent = nextExpanded ? '−' : '+'
  })
}

document.getElementById('prevMonth').addEventListener('click', () => cal.prevMonth())
document.getElementById('nextMonth').addEventListener('click', () => cal.nextMonth())
document.getElementById('todayBtn').addEventListener('click', () => cal.goToday())
if (jumpTodayBtn) {
  jumpTodayBtn.addEventListener('click', () => {
    activeCardDate = { year: cal.today.year, month: cal.today.month, day: cal.today.day }
    cal.selectedDate = { ...activeCardDate }
    renderWorkdayCard(activeCardDate)
    cal.goToday()
    document.getElementById('calendarSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function initTheme() {
  const stored = localStorage.getItem('qingli_theme')
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark')
    themeIcon.textContent = '☀️'
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
    themeIcon.textContent = '🌙'
  }
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme')
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('qingli_theme', next)
  themeIcon.textContent = next === 'dark' ? '☀️' : '🌙'
})

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split('')
  let line = ''
  let lineCount = 0

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight)
      line = words[i]
      lineCount++
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y + lineCount * lineHeight)
  return lineCount + 1
}

function generateWorkdayShareCard() {
  const brief = currentWorkdayBrief
  if (!brief) return

  const W = 750
  const H = 1000
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, W, H)
  gradient.addColorStop(0, '#FEF9EF')
  gradient.addColorStop(0.5, '#FFF5E6')
  gradient.addColorStop(1, '#F5F0E8')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(23, 32, 26, 0.03)'
  for (let i = 0; i < H; i += 8) {
    ctx.fillRect(0, i, W, 1)
  }

  ctx.fillStyle = '#8B7355'
  ctx.font = '500 18px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('今日轻历卡', W / 2, 60)

  const dateLine = brief.dateLine || ''
  ctx.fillStyle = '#B0A595'
  ctx.font = '400 14px "Noto Sans SC", sans-serif'
  ctx.fillText(dateLine, W / 2, 100)

  ctx.strokeStyle = 'rgba(23, 32, 26, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(80, 125)
  ctx.lineTo(W - 80, 125)
  ctx.stroke()

  ctx.fillStyle = '#2A2A2A'
  ctx.font = '700 28px "Ma Shan Zheng", "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  drawWrappedText(ctx, brief.headline || '', W / 2, 175, W - 120, 46)

  if (brief.subline) {
    ctx.fillStyle = '#6B5E52'
    ctx.font = '400 18px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(brief.subline, W / 2, 260)
  }

  const focusY = 300
  ctx.fillStyle = '#D4A574'
  ctx.font = '600 20px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('● 可以推进', 80, focusY)

  if (brief.focus && brief.focus.length > 0) {
    ctx.font = '400 17px "Noto Sans SC", sans-serif'
    let fy = focusY + 40
    brief.focus.forEach(item => {
      ctx.fillStyle = '#F5F0E8'
      ctx.fillRect(80, fy - 20, ctx.measureText(item).width + 24, 32)
      ctx.fillStyle = '#8B6914'
      ctx.fillText(item, 92, fy + 1)
      fy += 42
    })
  }

  const warnY = focusY + (brief.focus?.length || 2) * 42 + 60
  ctx.fillStyle = '#8B7E7E'
  ctx.font = '600 20px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('○ 先缓一缓', 80, warnY)

  if (brief.warning && brief.warning.length > 0) {
    ctx.font = '400 17px "Noto Sans SC", sans-serif'
    let wy = warnY + 40
    brief.warning.forEach(item => {
      ctx.fillStyle = '#F0EBE3'
      ctx.fillRect(80, wy - 20, ctx.measureText(item).width + 24, 32)
      ctx.fillStyle = '#6B5E52'
      ctx.fillText(item, 92, wy + 1)
      wy += 38
    })
  }

  ctx.textAlign = 'center'

  if (brief.chongsha) {
    ctx.fillStyle = '#C4A87C'
    ctx.font = '400 15px "Noto Sans SC", sans-serif'
    ctx.fillText(brief.chongsha, W / 2, H - 160)
  }

  ctx.fillStyle = '#B0A595'
  ctx.font = '400 13px "Noto Sans SC", sans-serif'
  ctx.fillText(brief.lunarLine || '', W / 2, H - 110)

  ctx.strokeStyle = 'rgba(23, 32, 26, 0.08)'
  ctx.beginPath()
  ctx.moveTo(80, H - 85)
  ctx.lineTo(W - 80, H - 85)
  ctx.stroke()

  ctx.fillStyle = '#C4B998'
  ctx.font = '400 12px "Noto Sans SC", sans-serif'
  ctx.fillText('数据来源：轻历 · 当日黄历与节气', W / 2, H - 55)

  return canvas
}

async function shareCanvas(canvas, title, text, fileName) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  const payload = {
    title,
    text,
    files: [new File([blob], fileName, { type: 'image/png' })],
  }
  if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
    await navigator.share(payload)
    return
  }

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
  showToast('卡片已保存')
}

if (shareWorkdayBtn) {
  shareWorkdayBtn.addEventListener('click', async () => {
    if (!currentWorkdayBrief) {
      showToast('数据加载中，请稍后再试')
      return
    }
    const canvas = generateWorkdayShareCard()
    if (!canvas) return
    try {
      const d = cal.today
      await shareCanvas(canvas, '轻历 - 今日卡', `${d.month}月${d.day}日 · 今日轻历`, `qingli-today-${d.month}-${d.day}.png`)
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed:', e)
    }
  })
}

if (panelShareBtn) {
  panelShareBtn.addEventListener('click', async () => {
    if (!selectedCell) return
    try {
      const cellData = selectedCell
      const d = cellData
      const todayData = cellData.lunarData
      const canvas = document.createElement('canvas')
      canvas.width = 750
      canvas.height = 1000
      const ctx = canvas.getContext('2d')

      const gradient = ctx.createLinearGradient(0, 0, 750, 1000)
      gradient.addColorStop(0, '#FEF9EF')
      gradient.addColorStop(0.5, '#FFF5E6')
      gradient.addColorStop(1, '#F5F0E8')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 750, 1000)

      ctx.fillStyle = 'rgba(23, 32, 26, 0.03)'
      for (let i = 0; i < 1000; i += 8) {
        ctx.fillRect(0, i, 750, 1)
      }

      ctx.fillStyle = '#8B7355'
      ctx.font = '500 20px "Noto Serif SC", serif'
      ctx.textAlign = 'center'
      ctx.fillText('📅 轻历 · 黄历', 375, 60)

      ctx.fillStyle = '#2A2A2A'
      ctx.font = '700 30px "Noto Serif SC", serif'
      ctx.fillText(`${d.year}年${d.month}月${d.day}日`, 375, 115)

      if (todayData) {
        ctx.fillStyle = '#6B5E52'
        ctx.font = '400 17px "Noto Sans SC", sans-serif'
        ctx.fillText(`农历${todayData.lunarMonthStr}月${todayData.lunarDayStr} · ${todayData.ganZhiYear}年 [${todayData.shengXiao}]`, 375, 155)
      }

      ctx.strokeStyle = 'rgba(23, 32, 26, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(80, 175)
      ctx.lineTo(670, 175)
      ctx.stroke()

      if (todayData) {
        let fy = 215
        ctx.fillStyle = '#D4A574'
        ctx.font = '600 20px "Noto Sans SC", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('● 宜', 80, fy)

        fy += 40
        ctx.font = '400 16px "Noto Sans SC", sans-serif'
        const yiItems = [...(todayData.yi || [])].slice(0, 12)
        let lx = 80
        yiItems.forEach(item => {
          const w = ctx.measureText(item).width + 24
          if (lx + w > 670) {
            lx = 80
            fy += 36
          }
          ctx.fillStyle = '#F5F0E8'
          ctx.fillRect(lx, fy - 18, w, 32)
          ctx.fillStyle = '#8B6914'
          ctx.fillText(item, lx + 12, fy + 1)
          lx += w + 12
        })

        fy += 60
        ctx.fillStyle = '#8B7E7E'
        ctx.font = '600 20px "Noto Sans SC", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('○ 忌', 80, fy)

        fy += 40
        const jiItems = [...(todayData.ji || [])].slice(0, 12)
        lx = 80
        jiItems.forEach(item => {
          const w = ctx.measureText(item).width + 24
          if (lx + w > 670) {
            lx = 80
            fy += 36
          }
          ctx.fillStyle = '#F0EBE3'
          ctx.fillRect(lx, fy - 18, w, 32)
          ctx.fillStyle = '#6B5E52'
          ctx.fillText(item, lx + 12, fy + 1)
          lx += w + 12
        })

        if (todayData.chongshaInfo && todayData.chongshaInfo.text) {
          fy += 60
          ctx.textAlign = 'center'
          ctx.fillStyle = '#C4A87C'
          ctx.font = '400 15px "Noto Sans SC", sans-serif'
          ctx.fillText(`⚠ ${todayData.chongSha || ''} · ${todayData.chongshaInfo.text}`, 375, fy)
        }
      }

      const dStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
      const events = eventStore.getEvents(dStr)
      if (events.length > 0) {
        let ey = todayData ? 730 : 500
        ctx.fillStyle = '#5A7A6A'
        ctx.font = '600 20px "Noto Sans SC", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('📌 当日事件', 375, ey)
        ey += 38
        ctx.font = '400 16px "Noto Sans SC", sans-serif'
        ctx.fillStyle = '#2A2A2A'
        events.forEach(e => {
          let line = e.title
          if (e.time) line = `${e.time}  ${line}`
          ctx.fillText(line, 375, ey)
          ey += 30
        })
      }

      ctx.textAlign = 'center'
      ctx.fillStyle = '#B0A595'
      ctx.font = '400 13px "Noto Sans SC", sans-serif'
      ctx.fillText('数据来源：轻历 · 当日黄历', 375, 950)

      ctx.fillStyle = '#C4B998'
      ctx.font = '400 12px "Noto Sans SC", sans-serif'
      ctx.fillText('纯天然 · 不含人工香精', 375, 975)

      await shareCanvas(canvas, '轻历', `${d.month}月${d.day}日 · 农历宜忌`, `qingli-${d.dayDate}.png`)
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed:', e)
    }
  })
}

initTheme()
initAmbientCanvas({ enabled: QINGLI_CONFIG.ambientMotion })
renderWorkdayCard(activeCardDate)
cal.render()

document.addEventListener('DOMContentLoaded', () => {
  function updateClock() {
    const now = new Date()
    const clockEl = document.getElementById('todayClock')
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false })
    }
  }
  updateClock()
  setInterval(updateClock, 1000)
})

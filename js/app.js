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
const sceneSwitch = document.getElementById('sceneSwitch')
const workdayHeadline = document.getElementById('workdayHeadline')
const workdaySubline = document.getElementById('workdaySubline')
const workdayDateLine = document.getElementById('workdayDateLine')
const workdayLunarLine = document.getElementById('workdayLunarLine')
const workdayFocusTags = document.getElementById('workdayFocusTags')
const workdayWarningTags = document.getElementById('workdayWarningTags')
const workdayRhythm = document.getElementById('workdayRhythm')
const workdayNote = document.getElementById('workdayNote')
const workdaySignal = document.getElementById('workdaySignal')
const jumpTodayBtn = document.getElementById('jumpTodayBtn')
const shareWorkdayBtn = document.getElementById('shareWorkdayBtn')

const SCENE_STORAGE_KEY = 'qingli_work_scene'
const DEFAULT_SCENE = 'work'

let activeScene = localStorage.getItem(SCENE_STORAGE_KEY) || DEFAULT_SCENE
let currentWorkdayBrief = null

window.qingliEvents = eventStore

function showToast(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2000)
}

const SCENE_COPY = {
  work: {
    label: '上班',
    headlines: [
      '今天适合礼貌推进，不适合无底线配合。',
      '今天适合把节奏握住，不适合被临时需求牵着走。',
      '今天适合清清楚楚地合作，不适合默默替全世界兜底。',
    ],
    sublines: [
      '能说清楚的事别靠默契，能排优先级的事别靠加班。',
      '先确认边界，再开始努力，体面人也要保护工时。',
      '善良可以有，默认接锅就先免了。',
    ],
    focus: ['排优先级', '确认边界', '推进小事', '收尾旧账'],
    warning: ['口头承诺', '临时加塞', '替人背锅', '情绪开麦'],
    note: '今日适合把事情往前推一点，但不必把自己也推进去。',
    weights: { 沟通: 78, 执行: 70, 边界: 82 },
  },
  meeting: {
    label: '开会',
    headlines: [
      '今天适合把结论写进纪要，不适合相信“大家都懂了”。',
      '今天适合追问负责人，不适合让共识停在空气里。',
      '今天适合少讲感受，多要下一步。',
    ],
    sublines: [
      '口头共识很轻，截图证据比较重。',
      '会可以开，锅最好别在会后自动分配到你身上。',
      '讨论归讨论，没人认领的任务先别急着心软。',
    ],
    focus: ['明确负责人', '记录结论', '确认时间点', '少说废话'],
    warning: ['模糊共识', '会后补锅', '无限发散', '临时拍板'],
    note: '今天的会议重点不是赢辩论，是让事情有名字、有主人、有截止时间。',
    weights: { 沟通: 86, 决策: 72, 背锅: 38 },
  },
  overtime: {
    label: '加班',
    headlines: [
      '今天适合止损，不适合把责任感开到最大功率。',
      '今天适合救急，不适合把常态问题伪装成奉献。',
      '今天适合把活做完，不适合把边界做没。',
    ],
    sublines: [
      '能明天解决的，不一定非要今晚献祭。',
      '加班可以救火，别顺手把消防队编制也接了。',
      '效率是能力，拒绝无效燃烧也是。',
    ],
    focus: ['拆小任务', '先做关键项', '留痕交付', '及时止损'],
    warning: ['无限补救', '深夜承诺', '单人扛雷', '越做越多'],
    note: '今晚如果必须加，就把目标缩到最小；活要收住，人也要收住。',
    weights: { 执行: 82, 消耗: 74, 边界: 68 },
  },
  slack: {
    label: '摸鱼',
    headlines: [
      '今天适合低调回血，不适合高调消失。',
      '今天适合战略性放空，不适合在群里留下犯罪现场。',
      '今天适合慢一点，不适合让状态栏替你做人设。',
    ],
    sublines: [
      '状态可以慢一点，鼠标最好别停太久。',
      '休息不是罪，演得太浮夸才容易出事。',
      '摸鱼讲究的是分寸，不是勇气。',
    ],
    focus: ['低调回血', '整理资料', '轻量沟通', '准点响应'],
    warning: ['高调失踪', '群聊露馅', '拖过节点', '忘记保存'],
    note: '今天可以给大脑松松绑，但别把日程也松没了。',
    weights: { 低调: 88, 风险: 34, 回血: 79 },
  },
  job: {
    label: '求职',
    headlines: [
      '今天适合体面争取，不适合自降身价。',
      '今天适合问清条件，不适合用热情抵扣薪资。',
      '今天适合展示能力，不适合把焦虑写在脸上。',
    ],
    sublines: [
      '你是在找工作，不是在参加忍耐力测试。',
      '机会要看，边界也要看；双向选择不是客套话。',
      '简历可以润色，底线别跟着压缩。',
    ],
    focus: ['更新简历', '确认岗位', '准备案例', '谈清条件'],
    warning: ['过度让步', '模糊薪资', '空头承诺', '急着答应'],
    note: '今天适合把自己讲清楚：能力、期待、底线，一个都别替对方省。',
    weights: { 表达: 82, 判断: 76, 谈判: 70 },
  },
  report: {
    label: '汇报',
    headlines: [
      '今天适合讲结果，不适合铺太多心理活动。',
      '今天适合先给结论，不适合让领导陪你找重点。',
      '今天适合用数字说话，不适合用努力感补位。',
    ],
    sublines: [
      '领导不一定爱听过程，但通常会尊重数字。',
      '先讲结果，再讲风险，最后讲你需要什么。',
      '材料可以厚，重点必须薄。',
    ],
    focus: ['先给结论', '带上数据', '暴露风险', '明确诉求'],
    warning: ['铺垫太长', '只讲辛苦', '没有下一步', '临场找数'],
    note: '今天的汇报别追求感人，追求清楚。清楚本身就很高级。',
    weights: { 表达: 84, 数据: 78, 重点: 88 },
  },
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

function pickByDate(list, scene, offset = 0) {
  const seed = cal.today.year + cal.today.month * 13 + cal.today.day * 17 + scene.length * 19 + offset
  return list[seed % list.length]
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))]
}

function mapTraditionalTerms(terms, dictionary, fallback) {
  const mapped = uniqueList((terms || []).map(term => dictionary[term]))
  return uniqueList([...mapped, ...fallback]).slice(0, 4)
}

function getDateMeta(todayData) {
  const date = new Date(cal.today.year, cal.today.month - 1, cal.today.day)
  const weekday = date.getDay()
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const markers = []
  if (todayData?.solarTerm) markers.push(todayData.solarTerm)
  if (todayData?.festival) markers.push(todayData.festival)
  if (todayData?.specialDay) markers.push(todayData.specialDay)
  return {
    weekday,
    weekdayName: weekdayNames[weekday],
    isWeekend: weekday === 0 || weekday === 6,
    isMonday: weekday === 1,
    isFriday: weekday === 5,
    markers,
  }
}

function buildWorkdayBrief(todayData, sceneKey) {
  const scene = SCENE_COPY[sceneKey] || SCENE_COPY[DEFAULT_SCENE]
  const meta = getDateMeta(todayData)
  const yiFocus = mapTraditionalTerms(todayData?.yi, YI_TO_WORK, scene.focus)
  const jiWarnings = mapTraditionalTerms(todayData?.ji, JI_TO_WORK, scene.warning)
  const adjustments = {
    monday: meta.isMonday ? -6 : 0,
    friday: meta.isFriday ? 7 : 0,
    weekend: meta.isWeekend ? -10 : 0,
    marker: meta.markers.length > 0 ? 5 : 0,
  }
  const rhythm = Object.entries(scene.weights).map(([label, value], index) => {
    const score = Math.max(22, Math.min(96, value + adjustments.friday + adjustments.marker + adjustments.weekend + index * 2))
    return { label, score }
  })

  const markerLine = meta.markers.length > 0
    ? `今天还碰上 ${meta.markers.join('、')}，适合顺手给日程留一点余地。`
    : scene.note

  return {
    scene: sceneKey,
    headline: pickByDate(scene.headlines, sceneKey),
    subline: pickByDate(scene.sublines, sceneKey, 7),
    focus: yiFocus,
    warning: jiWarnings,
    rhythm,
    note: markerLine,
    dateLine: `${cal.today.month}月${cal.today.day}日 ${meta.weekdayName} · ${scene.label}场景`,
    signal: `今日固定 · ${scene.label}场景 · 切换场景才变化`,
    lunarLine: todayData
      ? `农历${todayData.lunarMonthStr}月${todayData.lunarDayStr} · ${todayData.ganZhiYear}年 ${todayData.shengXiao}`
      : '今日黄历数据加载中',
  }
}

function renderWorkdayCard() {
  if (!SCENE_COPY[activeScene]) activeScene = DEFAULT_SCENE
  const todayData = cal.computeLunarData(cal.today.year, cal.today.month, cal.today.day)
  currentWorkdayBrief = buildWorkdayBrief(todayData, activeScene)
  const brief = currentWorkdayBrief

  if (workdayHeadline) workdayHeadline.textContent = brief.headline
  if (workdaySubline) workdaySubline.textContent = brief.subline
  if (workdayDateLine) workdayDateLine.textContent = brief.dateLine
  if (workdayLunarLine) workdayLunarLine.textContent = brief.lunarLine
  if (workdayNote) workdayNote.textContent = brief.note
  if (workdaySignal) workdaySignal.textContent = brief.signal
  if (workdayFocusTags) {
    workdayFocusTags.innerHTML = brief.focus.map(item => `<span>${escapeHtml(item)}</span>`).join('')
  }
  if (workdayWarningTags) {
    workdayWarningTags.innerHTML = brief.warning.map(item => `<span>${escapeHtml(item)}</span>`).join('')
  }
  if (workdayRhythm) {
    workdayRhythm.innerHTML = brief.rhythm.map(item => `
      <div class="rhythm-item">
        <div class="rhythm-head"><span>${escapeHtml(item.label)}</span><strong>${item.score}</strong></div>
        <div class="rhythm-track"><span style="width:${item.score}%"></span></div>
      </div>
    `).join('')
  }
  if (sceneSwitch) {
    sceneSwitch.querySelectorAll('.scene-chip').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.scene === activeScene)
    })
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
if (jumpTodayBtn) {
  jumpTodayBtn.addEventListener('click', () => {
    cal.goToday()
    document.getElementById('calendarSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

if (sceneSwitch) {
  sceneSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('.scene-chip')
    if (!btn) return
    activeScene = btn.dataset.scene || DEFAULT_SCENE
    localStorage.setItem(SCENE_STORAGE_KEY, activeScene)
    renderWorkdayCard()
  })
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
          cell.classList.add('is-selected')
        }
      })
    })
  })
})

cal.init().then(() => {
  renderWorkdayCard()
  if (!localStorage.getItem('qingli_bookmark_hint_shown')) {
    setTimeout(() => {
      showToast('按 Ctrl+D 收藏，明天继续看职场黄历')
      localStorage.setItem('qingli_bookmark_hint_shown', '1')
    }, 8000)
  }
}).catch(console.error)

if (panelShareBtn) {
  panelShareBtn.addEventListener('click', generateShareCard)
}

if (shareWorkdayBtn) {
  shareWorkdayBtn.addEventListener('click', generateWorkdayShareCard)
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const chars = Array.from(text)
  const lines = []
  let line = ''
  for (const char of chars) {
    const testLine = line + char
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = char
      if (lines.length === maxLines - 1) break
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)
  lines.slice(0, maxLines).forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight)
  })
  return y + lines.slice(0, maxLines).length * lineHeight
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

async function generateWorkdayShareCard() {
  if (!currentWorkdayBrief) renderWorkdayCard()
  const brief = currentWorkdayBrief
  if (!brief) return

  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const bg = '#F3F7F2'
  const ink = '#17201A'
  const muted = '#5F6F65'
  const accent = '#E84A3C'
  const blue = '#2F66D0'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#F7DE43'
  ctx.fillRect(90, 84, 230, 56)
  ctx.fillStyle = ink
  ctx.font = 'bold 30px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('今日职场签', 118, 122)

  ctx.font = '28px "Noto Sans SC", sans-serif'
  ctx.fillStyle = muted
  ctx.fillText(brief.dateLine, 90, 210)

  ctx.font = 'bold 70px "Noto Serif SC", "Source Han Serif CN", serif'
  ctx.fillStyle = ink
  let y = drawWrappedText(ctx, brief.headline, 90, 330, 900, 88, 3)

  ctx.font = '34px "Noto Sans SC", sans-serif'
  ctx.fillStyle = muted
  y = drawWrappedText(ctx, brief.subline, 90, y + 42, 860, 48, 2)

  ctx.font = 'bold 32px "Noto Sans SC", sans-serif'
  ctx.fillStyle = accent
  ctx.fillText('今日宜', 90, y + 84)
  ctx.fillStyle = ink
  ctx.font = '34px "Noto Sans SC", sans-serif'
  ctx.fillText(brief.focus.slice(0, 3).join(' · '), 220, y + 84)

  ctx.font = 'bold 32px "Noto Sans SC", sans-serif'
  ctx.fillStyle = blue
  ctx.fillText('今日忌', 90, y + 146)
  ctx.fillStyle = ink
  ctx.font = '34px "Noto Sans SC", sans-serif'
  ctx.fillText(brief.warning.slice(0, 3).join(' · '), 220, y + 146)

  ctx.strokeStyle = 'rgba(23, 32, 26, 0.16)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(90, 920)
  ctx.lineTo(990, 920)
  ctx.stroke()

  ctx.fillStyle = muted
  ctx.font = '28px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('轻历 · 懂职场情绪，也能认真查日子', W / 2, 980)

  try {
    await shareCanvas(canvas, '今日职场签', brief.headline, `qingli-workday-${cal.today.year}-${cal.today.month}-${cal.today.day}.png`)
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('Share failed:', e)
  }
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
    await shareCanvas(canvas, '轻历', `${d.month}月${d.day}日 · 农历宜忌`, `qingli-${d.dayDate}.png`)
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('Share failed:', e)
  }
}

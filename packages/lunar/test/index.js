import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getLunarCalendar, getMonthCalendar, TRADITIONAL_FESTIVALS, SPECIAL_DAYS } from '../index.js'

describe('@qingli/lunar', () => {

  it('gets lunar info for known date', () => {
    const r = getLunarCalendar(2026, 5, 27)
    assert.equal(r.date, '2026-05-27')
    assert.equal(r.shengXiao, '马')
    assert.equal(r.ganZhi.year, '丙午')
    assert.ok(r.lunar.month > 0)
    assert.ok(r.lunar.day > 0)
    assert.ok(Array.isArray(r.yi))
    assert.ok(Array.isArray(r.ji))
  })

  it('detects solar term 小满', () => {
    const r = getLunarCalendar(2026, 5, 21)
    assert.equal(r.solarTerm, '小满')
    assert.ok(r.festivals.includes('小满'))
  })

  it('detects 520 special day', () => {
    const r = getLunarCalendar(2026, 5, 20)
    assert.ok(r.festivals.includes('520'))
  })

  it('detects 五一 holiday', () => {
    const r = getLunarCalendar(2026, 5, 1)
    assert.equal(r.isHoliday, true)
  })

  it('detects 春节 traditional festival', () => {
    const r = getLunarCalendar(2026, 2, 17)
    assert.equal(r.traditionalFestival, '春节')
  })

  it('handles whole month', () => {
    const days = getMonthCalendar(2026, 5)
    assert.equal(days.length, 31)
  })

  it('provides festival data', () => {
    assert.ok(Object.keys(TRADITIONAL_FESTIVALS).length > 10)
    assert.ok(Object.keys(SPECIAL_DAYS).length > 10)
  })

})

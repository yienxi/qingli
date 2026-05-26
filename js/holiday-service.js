import { HolidayUtil } from 'https://esm.sh/lunar-typescript@1.8.6'

export class HolidayService {
  constructor() {
    this.cache = new Map()
    this.lastUpdate = null
    this.isLoading = false
    this.error = null
    this.dataVersion = null
    this.updateAvailable = false
  }

  async getHolidays(year, forceRefresh = false) {
    const cacheKey = `holidays_${year}`
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return cached.data
      }
    }

    this.isLoading = true
    this.error = null

    try {
      const response = await fetch(`/api/holidays?year=${year}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.version && this.dataVersion && data.version !== this.dataVersion) {
        this.updateAvailable = true
      }
      this.dataVersion = data.version || 'unknown'
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        version: this.dataVersion
      })
      
      return data
    } catch (err) {
      console.warn('Failed to fetch holidays from API, using fallback:', err.message)
      this.error = err
      return this.getFallbackHolidays(year)
    } finally {
      this.isLoading = false
    }
  }

  getFallbackHolidays(year) {
    const holidays = []
    try {
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(year, m, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          const holiday = HolidayUtil.getHoliday(year, m, d)
          if (holiday) {
            holidays.push({
              date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              name: holiday.getName(),
              isWork: holiday.isWork()
            })
          }
        }
      }
    } catch (e) {
      console.warn('Fallback holiday generation failed:', e)
    }
    return { holidays, version: 'fallback' }
  }

  async isHoliday(year, month, day) {
    const data = await this.getHolidays(year)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return data.holidays.find(h => h.date === dateStr) || null
  }

  clearCache() {
    this.cache.clear()
    this.lastUpdate = null
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      isLoading: this.isLoading,
      hasError: !!this.error
    }
  }
}

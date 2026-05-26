const STORAGE_KEY = 'qingli_events'

export class EventStore {
  constructor() {
    this.events = this.load()
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events))
    } catch (e) {
      console.warn('Failed to save events:', e)
    }
  }

  getEvents(dateStr) {
    if (!dateStr) return []
    return this.events.filter(e => e.date === dateStr)
  }

  addEvent({ date, title, time, color }) {
    const event = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date,
      title: title.trim(),
      time: time || '',
      color: color || '#5B8F7A',
      createdAt: new Date().toISOString(),
    }
    this.events.push(event)
    this.save()
    return event
  }

  deleteEvent(id) {
    this.events = this.events.filter(e => e.id !== id)
    this.save()
  }

  updateEvent(id, updates) {
    const idx = this.events.findIndex(e => e.id === id)
    if (idx !== -1) {
      this.events[idx] = { ...this.events[idx], ...updates }
      this.save()
      return this.events[idx]
    }
    return null
  }

  getAllEvents() {
    return [...this.events]
  }

  getEventsInRange(startDate, endDate) {
    return this.events.filter(e => e.date >= startDate && e.date <= endDate)
  }

  exportJSON() {
    return JSON.stringify(this.events, null, 2)
  }

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr)
      if (Array.isArray(data)) {
        this.events = data
        this.save()
        return true
      }
      return false
    } catch {
      return false
    }
  }
}

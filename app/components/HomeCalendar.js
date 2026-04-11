'use client'
import { useState } from 'react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function HomeCalendar() {
  const now = new Date()
  const [events, setEvents] = useState([
    { day: 14, month: now.getMonth(), year: now.getFullYear(), label: 'Open Pantry Hours', detail: 'Walk-in · 10am–2pm' },
    { day: 18, month: now.getMonth(), year: now.getFullYear(), label: 'Grocery Program Pickup', detail: 'Pre-orders only' },
  ])
  const [showPanel, setShowPanel] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [label, setLabel] = useState('')
  const [detail, setDetail] = useState('')

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const today = now.getDate()

  function addEvent() {
    if (!selectedDay || !label.trim()) return
    setEvents(prev => [...prev, {
      day: selectedDay,
      month: now.getMonth(),
      year: now.getFullYear(),
      label: label.trim(),
      detail: detail.trim() || 'Pantry event'
    }])
    setLabel('')
    setDetail('')
    setSelectedDay(null)
    setShowPanel(false)
  }

  const sorted = [...events].sort((a, b) => a.day - b.day)

  return (
    <div className="home-calendar-section">
      <div className="home-calendar-header">
        <h2 className="home-calendar-title">Upcoming Events</h2>
        <button className="cal-toggle-btn" onClick={() => setShowPanel(p => !p)}>
          <CalIcon />
          {showPanel ? 'Cancel' : 'Add event'}
        </button>
      </div>

      {showPanel && (
        <div className="cal-panel">
          <p className="cal-panel-label">Pick a date</p>
          <div className="cal-month-label">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</div>
          <div className="cal-grid">
            {DAY_NAMES.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={'e'+i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const isToday = d === today
              const isSelected = d === selectedDay
              return (
                <div
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`cal-day ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''}`}
                >{d}</div>
              )
            })}
          </div>
          <input
            className="cal-input"
            placeholder="Event name (e.g. Open Hours)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <input
            className="cal-input"
            placeholder="Details (optional)"
            value={detail}
            onChange={e => setDetail(e.target.value)}
          />
          <button className="cal-save-btn" onClick={addEvent}>Save event</button>
        </div>
      )}

      <div className="event-list">
        {sorted.length === 0 && <p className="no-events">No upcoming events.</p>}
        {sorted.map((ev, i) => (
          <div key={i} className="event-card">
            <div className="event-date-box">
              <span className="event-day-num">{ev.day}</span>
              <span className="event-month">{MONTH_NAMES[ev.month].slice(0,3).toUpperCase()}</span>
            </div>
            <div className="event-info">
              <p className="event-name">{ev.label}</p>
              <p className="event-detail">{ev.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1"/>
      <path d="M5 1.5V3.5M11 1.5V3.5M1.5 6H14.5" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
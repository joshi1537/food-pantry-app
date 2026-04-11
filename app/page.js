<<<<<<< HEAD
'use client'

async function askGemini(prompt) 
{
  const res = await fetch('/api/gemini', 
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  })
  const data = await res.json()
  return data.text
}
export default function HomePage() 
{
=======
import HomeCalendar from './components/HomeCalendar'

export default function HomePage() {
>>>>>>> e0603154c83a5e8c64429c036ac3159f2dfdf248
  return (
    <div className="pageBody">
      <h1 className="pageTitle">Virginia Tech Food Pantry</h1>
      <p className="page-subtitle">A simple inventory system for the VT food pantry.</p>

      <HomeCalendar />

      <div className="card-grid">
        <a href="/inventory" className="card">
          <h2 className="cardTitle">Inventory</h2>
          <p className="cardWriting">View and manage food stock</p>
        </a>
        <br />
        <a href="/vendors" className="card">
          <h2 className="cardTitle">Vendors</h2>
          <p className="cardWriting">Track supplier information</p>
        </a>
        <br />
        <a href="/transfers" className="card">
          <h2 className="cardTitle">Transfers</h2>
          <p className="cardWriting">Log incoming and outgoing items</p>
        </a>
        <br />
        <a href="/reports" className="card">
          <h2 className="cardTitle">Reports</h2>
          <p className="cardWriting">Generate insights and summaries</p>
        </a>
        <br />
      </div>
    </div>
  )
}
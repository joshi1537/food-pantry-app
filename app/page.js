export default function HomePage() 
{
  return (
    <div className="pageBody">
      <h1 className="pageTitle">Virginia Tech Food Pantry</h1>
      <p className="page-subtitle">A simple inventory system for the VT food pantry.</p>

      <div className="card-grid">
        <a href="/inventory" className="card">
          <h2 className="cardTitle">Inventory</h2>
          <p className="cardWriting">View and manage food stock</p>
        </a>
        <br></br>

        <a href="/vendors" className="card">
          <h2 className="cardTitle">Vendors</h2>
          <p className="cardWriting">Track supplier information</p>
        </a>
        <br></br>

        <a href="/transfers" className="card">
          <h2 className="cardTitle">Transfers</h2>
          <p className="cardWriting">Log incoming and outgoing items</p>
        </a>
        <br></br>

        <a href="/reports" className="card">
          <h2 className="cardTitle">Reports</h2>
          <p className="cardWriting">Generate insights and summaries</p>
        </a>
        <br></br>
      </div>
    </div>
  )
}
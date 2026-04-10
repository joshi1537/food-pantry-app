'use client'
import { usePathname } from 'next/navigation'

export default function Navbar() 
{
  const pathname = usePathname()

  return (
    <nav className="navbar">
      <span className="navbar-brand">VT Food Pantry</span>
      <div className="navbar-links">
        <a href="/" className={pathname === '/' ? 'nav-link-active' : 'nav-link'}>Home</a>
        <a href="/dashboard" className={pathname === '/dashboard' ? 'nav-link-active' : 'nav-link'}>Dashboard</a>
        <a href="/inventory" className={pathname === '/inventory' ? 'nav-link-active' : 'nav-link'}>Inventory</a>
        <a href="/vendors" className={pathname === '/vendors' ? 'nav-link-active' : 'nav-link'}>Vendors</a>
        <a href="/transfers" className={pathname === '/transfers' ? 'nav-link-active' : 'nav-link'}>Transfers</a>
        <a href="/reports" className={pathname === '/reports' ? 'nav-link-active' : 'nav-link'}>Reports</a>
      </div>
    </nav>
  )
}
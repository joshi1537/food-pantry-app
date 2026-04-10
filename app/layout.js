import "./globals.css"
import Navbar from "./components/Navbar"

export const metadata = {
  title: "VT Food Pantry",
  description: "Inventory and vendor management system",
}

export default function RootLayout({ children }) 
{
  return (
    <html lang="en">
      <body>
        <Navbar/>
        <main className="main-content">{children}</main>
      </body>
    </html>
  )
}
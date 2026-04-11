import "./globals.css"
import Navbar from "./components/Navbar"
import ChatWidget from "./components/ChatWidget"

export const metadata = {
  title: "VT Food Pantry",
  description: "Inventory and vendor management system",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar />
        <main className="main-content">{children}</main>
        <ChatWidget />
      </body>
    </html>
  )
}
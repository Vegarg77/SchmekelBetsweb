import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-dark-700 py-4 text-center text-dark-400 text-xs">
        🪙 SchmekelBets — play responsibly (they're not real)
      </footer>
    </div>
  )
}

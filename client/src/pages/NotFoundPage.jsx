import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <div className="text-7xl mb-6 animate-float">🪙</div>
      <h1 className="text-4xl font-bold mb-3">404</h1>
      <p className="text-dark-400 text-lg mb-6">
        This page doesn't exist. You lost your Schmekel.
      </p>
      <Link to="/" className="btn-primary">
        Back to Markets
      </Link>
    </div>
  )
}

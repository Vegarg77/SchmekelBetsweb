// Reusable card with consistent styling
export default function SchmCard({ children, className = '', hover = false }) {
  return (
    <div className={`${hover ? 'card-hover' : 'card'} ${className}`}>
      {children}
    </div>
  )
}

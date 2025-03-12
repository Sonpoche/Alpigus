'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Une erreur est survenue</h2>
        <button
          onClick={() => reset()}
          className="bg-custom-accent text-white px-4 py-2 rounded-md"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
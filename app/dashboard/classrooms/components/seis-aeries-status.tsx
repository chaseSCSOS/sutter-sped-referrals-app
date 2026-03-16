interface SeisAeriesStatusProps {
  seisConfirmed: boolean
  aeriesConfirmed: boolean
}

export default function SeisAeriesStatus({ seisConfirmed, aeriesConfirmed }: SeisAeriesStatusProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          seisConfirmed ? 'text-green-700' : 'text-red-500'
        }`}
      >
        {seisConfirmed ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        SEIS
      </span>
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          aeriesConfirmed ? 'text-green-700' : 'text-red-500'
        }`}
      >
        {aeriesConfirmed ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        Aeries
      </span>
    </span>
  )
}

import type { LandmarkId } from '../../data/types'

/** Small, consistent SVG emblems for each landmark (used in lists, stamps, passport). */
export function LandmarkEmblem({ id, size = 48, className = '', tone = 'light' }: { id: LandmarkId; size?: number; className?: string; tone?: 'light' | 'dark' | 'gold' }) {
  const c = tone === 'dark' ? '#0f3d2e' : tone === 'gold' ? '#c9a24a' : '#fdfaf3'
  const s = { fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden>
      {id === 'quba' && (
        <g {...s}>
          <path d="M6 40h36M9 40V25h30v15" />
          <path d="M8 40V14m0 0-1.5 2M8 14l1.5 2M8 11v3M40 40V14m0 0-1.5 2M40 14l1.5 2M40 11v3" />
          <path d="M14 25a4 4 0 0 1 8 0M20 25a4 4 0 0 1 8 0M26 25a4 4 0 0 1 8 0" />
          <path d="M19 21a5 5 0 0 1 10 0M24 16v-2" />
          <path d="M21 40v-6a3 3 0 0 1 6 0v6" />
        </g>
      )}
      {id === 'uhud' && (
        <g {...s}>
          <path d="M3 38l9-13 5 5 8-14 7 10 4-4 9 16z" />
          <path d="M8 42c4-3 9-3 13 0" />
          <path d="M27 42h10M29 42v-3h6v3" />
          <path d="M22 22l3 2 3-3" />
        </g>
      )}
      {id === 'hejaz' && (
        <g {...s}>
          <path d="M5 40h38M7 40V22h34v18" />
          <path d="M10 30v-3a1.6 1.6 0 0 1 3.2 0v3M16 30v-3a1.6 1.6 0 0 1 3.2 0v3M22.4 30v-3a1.6 1.6 0 0 1 3.2 0v3M28.8 30v-3a1.6 1.6 0 0 1 3.2 0v3M35 30v-3a1.6 1.6 0 0 1 3.2 0v3" />
          <path d="M7 22l3-4h28l3 4M14 18v-3h4v3" />
          <path d="M9 36h30" />
        </g>
      )}
      {id === 'qiblatain' && (
        <g {...s}>
          <path d="M6 40h36M11 40V26h26v14" />
          <path d="M14 26a5 5 0 0 1 10 0M24 26a5.5 5.5 0 0 1 11 0" />
          <path d="M29.5 20.5v-2.5M19 21v-2" />
          <path d="M8 40V15m0 0-1.4 2M8 15l1.4 2M8 12v3M40 40V15m0 0-1.4 2M40 15l1.4 2M40 12v3" />
          <path d="M21 40v-6a3 3 0 0 1 6 0v6" />
        </g>
      )}
      {id === 'haram' && (
        <g {...s}>
          <path d="M4 40h40M10 40V27h28v13" />
          <path d="M27 27a5 5 0 0 1 10 0M32 22v-2" />
          <path d="M14 27a3 3 0 0 1 6 0" />
          <path d="M6 40V12m0 0-1.3 2M6 12l1.3 2M6 9v3M42 40V12m0 0-1.3 2M42 12l1.3 2M42 9v3M24 27V15m0 0-1.2 2M24 15l1.2 2M24 12v3" />
          <path d="M12 33h3M18 33h3M27 33h3M33 33h3" />
        </g>
      )}
      {(id === 'ghamama' || id === 'ijabah' || id === 'manaratain' || id === 'jumuah') && (
        <g {...s}>
          <path d="M6 40h36M10 40V28h28v12" />
          {id === 'ghamama' ? <path d="M11 28a2.4 2.4 0 0 1 4.8 0M16.4 28a2.4 2.4 0 0 1 4.8 0M26.8 28a2.4 2.4 0 0 1 4.8 0M32.2 28a2.4 2.4 0 0 1 4.8 0M19 28a5 5 0 0 1 10 0" /> : <path d="M17 28a7 7 0 0 1 14 0M24 21v-2" />}
          {id === 'jumuah' && <path d="M12 28a2.5 2.5 0 0 1 5 0M31 28a2.5 2.5 0 0 1 5 0" />}
          {id === 'manaratain' ? <path d="M8 40V16m0 0-1.3 2M8 16l1.3 2M8 13v3M40 40V16m0 0-1.3 2M40 16l1.3 2M40 13v3" /> : <path d="M40 40V14m0 0-1.3 2M40 14l1.3 2M40 11v3" />}
          <path d="M21 40v-6a3 3 0 0 1 6 0v6" />
        </g>
      )}
      {id === 'baqi' && (
        <g {...s}>
          <path d="M5 38h38M7 38V30h34v8" />
          <path d="M19 38v-9a5 5 0 0 1 10 0v9" />
          <path d="M17 24h14" />
        </g>
      )}
      {id === 'sabaa' && (
        <g {...s}>
          <path d="M4 40c6-12 14-20 24-22 6 4 12 12 16 22z" />
          <path d="M9 40v-5h6v5M9 35a3 3 0 0 1 6 0M19 40v-4h5v4M19 36a2.5 2.5 0 0 1 5 0M30 28v-4h5v4M30 24a2.5 2.5 0 0 1 5 0" />
        </g>
      )}
      {id === 'miqat' && (
        <g {...s}>
          <path d="M5 40h38M8 40V28h32v12" />
          <path d="M24 40V8l-3 5h6l-3-5M21 13v27M27 13v27" />
          <path d="M11 28a3 3 0 0 1 6 0M31 28a3 3 0 0 1 6 0" />
        </g>
      )}
      {id === 'quranComplex' && (
        <g {...s}>
          <path d="M24 16c-5-3-11-3-16-1v22c5-2 11-2 16 1 5-3 11-3 16-1V15c-5-2-11-2-16 1z" />
          <path d="M24 16v22M12 21h7M12 26h7M29 21h7M29 26h7" />
        </g>
      )}
      {id === 'rumah' && (
        <g {...s}>
          <path d="M14 40v-9h20v9M12 31h24" />
          <path d="M16 31V19M32 31V19M14 19h20M24 19v6" />
          <path d="M6 40V26m0 0c-3-1-4 1-4 1m4-1c3-1 4 1 4 1M42 40V26m0 0c-3-1-4 1-4 1m4-1c3-1 4 1 4 1" />
        </g>
      )}
      {id === 'aqiq' && (
        <g {...s}>
          <path d="M4 34c8-5 14 3 22-2s12-4 18-1" />
          <path d="M4 40c8-5 14 3 22-2s12-4 18-1" />
          <path d="M14 30V14m0 0c-4-2-7 1-7 1m7-1c4-2 7 1 7 1m-7-1c-1-4 1-6 1-6M34 28V16m0 0c-3-2-6 1-6 1m6-1c3-2 6 1 6 1" />
        </g>
      )}
    </svg>
  )
}

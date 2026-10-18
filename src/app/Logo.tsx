/** Marca Ryuk: la estrella del emblema dentro del anillo naranja, más el nombre. */
export function LogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ryuk-ring" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#ryuk-ring)" strokeWidth="3" />
      <path d="M20 9.5l3.2 6.4 7 1-5.1 5 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5.1-5 7-1z" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ className = 'h-9', light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-full w-auto aspect-square" />
      <span className={`font-bold tracking-tight text-lg leading-none ${light ? 'text-white' : 'text-slate-900'}`}>
        Ryuk<span className={`hidden min-[400px]:inline font-medium ${light ? 'text-slate-300' : 'text-slate-500'}`}> · Gestión escolar</span>
      </span>
    </span>
  );
}

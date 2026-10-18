import { LogoMark } from './Logo';

export default function FullLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-5" role="status">
      <span className="relative w-16 h-16 rounded-full ring-pulse">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 border-r-amber-400 animate-spin" />
        <LogoMark className="absolute inset-2 w-12 h-12 anim-float" />
      </span>
      <span className="text-sm font-medium anim-fade">{label}</span>
    </div>
  );
}

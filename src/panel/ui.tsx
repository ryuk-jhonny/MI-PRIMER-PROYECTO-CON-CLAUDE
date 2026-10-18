import { ReactNode, useEffect } from 'react';
import { LucideIcon, X } from 'lucide-react';

export const btn = {
  primary: 'h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] disabled:opacity-50',
  ghost: 'h-11 px-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition',
  danger: 'h-11 px-4 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-200 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition',
};

export const input = 'h-11 w-full px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-slate-900 border border-slate-800 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'slate' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' }) {
  const tones = {
    slate: 'text-slate-300 bg-slate-800',
    emerald: 'text-emerald-300 bg-emerald-500/15',
    amber: 'text-amber-300 bg-amber-500/15',
    rose: 'text-rose-300 bg-rose-500/15',
    sky: 'text-sky-300 bg-sky-500/15',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-4.5 h-4.5" /></span>
      </div>
      <div className="mt-3 text-3xl font-bold text-white tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-8 sm:p-12 text-center">
      <span className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto"><Icon className="w-7 h-7" /></span>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      {children && <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-5 flex justify-center gap-2 flex-wrap">{action}</div>}
    </Card>
  );
}

export const STATUS_STYLE: Record<string, string> = {
  Puntual: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Tardanza: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Justificada: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Inasistencia: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold ${className}`}>{children}</span>;
}

export function Avatar({ src, name, className = 'w-10 h-10' }: { src?: string; name: string; className?: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return src ? (
    <img src={src} alt="" loading="lazy" className={`${className} rounded-xl object-cover bg-slate-800 shrink-0`} />
  ) : (
    <span className={`${className} rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0`} aria-hidden="true">{ini}</span>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 cursor-default" onClick={onClose} tabIndex={-1} />
      <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4 animate-fade-up`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-9 h-9 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const label = 'block text-xs font-semibold text-slate-300 mb-1.5';
export const textarea = 'w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20';

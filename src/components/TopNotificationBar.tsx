import { Phone, UserCheck, ShieldCheck } from 'lucide-react';

interface TopNotificationBarProps {
  onOpenDemoModal?: () => void;
  onOpenAccessModal?: (role?: 'docente' | 'student' | 'director') => void;
}

export default function TopNotificationBar({ onOpenAccessModal }: TopNotificationBarProps) {
  return (
    <div className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left message */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>Sistema Institucional Ryuk</span>
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">
            Plataforma integral de gestión de portafolios docentes, asistencia QR y calificaciones en tiempo real
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => onOpenAccessModal?.()}
            className="flex items-center gap-1.5 text-slate-300 hover:text-orange-400 transition-colors cursor-pointer bg-slate-800/60 hover:bg-slate-800 px-2.5 py-0.5 rounded-full"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Portal Docente</span>
          </button>
          <span className="text-slate-600">·</span>
          <a
            href="tel:957736411"
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Soporte: 957736411</span>
          </a>
        </div>
      </div>
    </div>
  );
}

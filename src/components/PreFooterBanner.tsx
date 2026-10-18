import { ArrowRight } from 'lucide-react';

interface PreFooterBannerProps {
  onOpenDemoModal: () => void;
}

export default function PreFooterBanner({ onOpenDemoModal }: PreFooterBannerProps) {
  return (
    <div className="bg-[#0b1329] text-white py-14 border-t border-slate-800 relative overflow-hidden">
      {/* Decorative subtle background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          <div className="max-w-2xl space-y-2">
            <span className="text-[11px] font-extrabold tracking-[0.25em] text-orange-400 uppercase">
              CONVENIOS E IMPLEMENTACIÓN ESCOLAR 2026
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
              Impulsa la Excelencia de tu Colegio con Ryuk
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
              Ordena la asistencia con carnet QR, registra notas CNEB y mantén informadas a las familias desde el celular.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={onOpenDemoModal}
              className="px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>Solicitar Demostración</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

import { 
  ArrowRight, 
  Play, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Globe, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { navigate } from '../lib/router';

interface HeroProps {
  onOpenDemoModal: () => void;
  onScrollToSimulator: () => void;
  onNavigateToModule?: (moduleId: string) => void;
  onOpenAccessModal?: (role?: 'docente' | 'student' | 'director') => void;
}

export default function Hero({ onOpenDemoModal, onScrollToSimulator, onNavigateToModule, onOpenAccessModal }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-14 lg:pt-14 lg:pb-20 bg-gradient-to-b from-white via-orange-50/20 to-white">
      {/* Decorative floral/curved background shapes inspired by reference */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Proposition, Headline & CTAs (Span 7) */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Kicker badge style from reference */}
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">
              <span>APRENDER</span>
              <span className="text-orange-300">·</span>
              <span>GESTIONAR</span>
              <span className="text-orange-300">·</span>
              <span>INNOVAR</span>
            </div>

            {/* Editorial Serif Headline matching reference */}
            <h1 className="font-serif-title text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.12] [text-wrap:balance]">
              Un Futuro Educativo Más Brillante{' '}
              <span className="text-orange-500 relative inline-block">
                Comienza con Ryuk
                {/* Sunburst accent lines like in reference */}
                <svg
                  className="absolute -top-3 -right-6 w-6 h-6 text-orange-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2v3M12 19v3M3 12h3M19 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12" />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-sans">
              La plataforma para <strong className="text-slate-800 font-semibold">colegios de inicial, primaria y secundaria</strong>: registra la <strong className="text-slate-800 font-semibold">asistencia con el carnet QR</strong> desde cualquier celular, pon <strong className="text-slate-800 font-semibold">notas con la escala del CNEB</strong>, imprime libretas y deja que las familias vean todo con solo escanear el carnet.
            </p>

            {/* Dual Action Buttons matching reference style */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2 w-full sm:w-auto">
              <button
                onClick={onOpenDemoModal}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-bold text-white bg-orange-700 hover:bg-orange-800 rounded-full shadow-lg shadow-orange-700/25 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Solicitar Demostración</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onScrollToSimulator}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-full shadow-xs hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Ver Simulador en Vivo</span>
              </button>
            </div>

            {/* 4 Icon Value Props exactly like the reference */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-4 border-t border-slate-200/80">
              <button
                onClick={() => onNavigateToModule ? onNavigateToModule('portafolio') : onScrollToSimulator()}
                className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">Portafolio CNEB</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Próximamente</p>
              </button>

              <button
                onClick={() => onNavigateToModule ? onNavigateToModule('portafolio') : onScrollToSimulator()}
                className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Docentes Conectados</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Carga ágil de calificaciones</p>
              </button>

              <button
                onClick={() => onNavigateToModule ? onNavigateToModule('asistencia-qr') : onScrollToSimulator()}
                className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Asistencia QR Segura</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Lectura con la cámara del celular</p>
              </button>

              <button
                onClick={() => onNavigateToModule ? onNavigateToModule('registro-notas') : onScrollToSimulator()}
                className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Notas en Tiempo Real</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Libreta digital para móviles</p>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual with Students and Floating Social Proof (Span 5) */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">

            {/* Botón Acceder prominente con la misma tonalidad naranja de Solicitar Demostración */}
            <div className="w-full max-w-[500px] mb-5 flex justify-center lg:justify-end">
              <button
                type="button"
                onClick={() => onOpenAccessModal?.()}
                className="w-full sm:w-auto px-12 py-4 text-base sm:text-lg font-extrabold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center tracking-wide"
              >
                Acceder
              </button>
            </div>

            {/* Main Image Frame */}
            <div className="relative rounded-3xl overflow-hidden border-[6px] border-white shadow-2xl bg-slate-900 aspect-4/3 w-full max-w-[500px]">
              <img
                src="/img/hero-school-students.webp"
                alt="Estudiantes en uniformes escolares sonriendo en campus moderno institucional Ryuk"
                className="w-full h-full object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
              />

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

              {/* Institution Crest watermark in top-left */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Inicial, Primaria y Secundaria</span>
              </div>
            </div>

            {/* Acceso directo a la demo del panel */}
            <div
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/demo'); }}
              onClick={() => navigate('/demo')}
              className="absolute -bottom-5 right-4 z-20 bg-white rounded-full p-2 pr-5 border border-slate-200 shadow-xl flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="flex -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                  alt="Estudiante"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=80"
                  alt="Estudiante"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                  alt="Estudiante"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 leading-none">
                  Prueba el panel
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Demo gratis, sin registrarte
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

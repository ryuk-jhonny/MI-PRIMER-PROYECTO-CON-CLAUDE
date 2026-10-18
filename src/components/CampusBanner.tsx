import { Play, BookOpen, Microscope, Activity, Music, ShieldCheck } from 'lucide-react';

interface CampusBannerProps {
  onScrollToSimulator: () => void;
}

export default function CampusBanner({ onScrollToSimulator }: CampusBannerProps) {
  return (
    <section id="campus" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-3">
          <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">
            INFRAESTRUCTURA Y ECOSISTEMA ESCOLAR
          </span>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight">
            Un Entorno Seguro, Moderno y Conectado para tu Institución
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Plataforma en la nube de alta disponibilidad, control de acceso mediante QR en puertas y aulas, y registro instantáneo que brinda tranquilidad a toda la comunidad educativa.
          </p>
        </div>

        {/* Panoramic Visual with Center Play Button matching reference */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl aspect-16/9 md:aspect-21/9 bg-slate-900 mb-10 group">
          <img
            src="/img/campus-panoramic-modern.webp"
            alt="Campus educativo moderno y conectado con Sistema Ryuk"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Scrim */}
          <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/40 transition-colors pointer-events-none" />



          {/* Center Play Button like reference's "Take a Virtual Tour" */}
          <button
            onClick={onScrollToSimulator}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-3.5 rounded-full bg-slate-900/90 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md shadow-2xl transition-all cursor-pointer border border-white/20 hover:scale-105"
          >
            <div className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <span>Explorar Simulador Interactivo</span>
          </button>
        </div>

        {/* 5 Icons Row below panoramic visual matching reference */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-2">
          <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Aulas Digitalizadas</h4>
            <p className="text-[11px] text-slate-500">Asistencia y notas en 1 clic</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Microscope className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Rúbricas Científicas</h4>
            <p className="text-[11px] text-slate-500">Evaluación formativa</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Control de Actividades</h4>
            <p className="text-[11px] text-slate-500">Talleres extracurriculares</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Arte y Cultura</h4>
            <p className="text-[11px] text-slate-500">Portafolios artísticos</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Campus Seguro QR</h4>
            <p className="text-[11px] text-slate-500">Ingreso 100% verificado</p>
          </div>
        </div>

      </div>
    </section>
  );
}

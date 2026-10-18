import { ArrowRight, ArrowUpRight } from 'lucide-react';

interface LifeAndActivitiesProps {
  onScrollToSimulator: () => void;
  onOpenDemoModal: () => void;
}

export default function LifeAndActivities({ onScrollToSimulator, onOpenDemoModal }: LifeAndActivitiesProps) {
  const activities = [
    {
      title: 'Deportes y Asistencia en Campo',
      category: 'Vida Deportiva',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&auto=format&fit=crop&q=80',
      description: 'Control de asistencia en entrenamientos y torneos intercolegiales con escaneo móvil rápido.',
    },
    {
      title: 'Arte, Música y Cultura',
      category: 'Expresión Artística',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
      description: 'Portafolios artísticos digitales y registro de participación en talleres y ensambles.',
    },
    {
      title: 'Clubes y Ciencias',
      category: 'Innovación Escolar',
      image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400&auto=format&fit=crop&q=80',
      description: 'Seguimiento de proyectos STEM, laboratorios de robótica y evaluación formativa por rúbricas.',
    },
    {
      title: 'Eventos y Ceremonias',
      category: 'Comunidad Escolar',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&auto=format&fit=crop&q=80',
      description: 'Validación de ingreso con carnet QR para asambleas de padres y actos oficiales.',
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header matching reference's "More Than Just Academics" */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">
              ECOSISTEMA INTEGRAL RYUK
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight">
              Más que un Software: La Experiencia Escolar Conectada
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed pt-1">
              Impulsamos el desarrollo integral de los estudiantes: control de asistencia ágil en eventos y deportes, seguimiento de talleres y participación activa de las familias.
            </p>
          </div>

          <div>
            <button
              onClick={onOpenDemoModal}
              className="px-6 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-md shadow-orange-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explorar Vida Escolar Ryuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Cards Row matching reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((act, index) => (
            <div
              key={index}
              onClick={onScrollToSimulator}
              className="group rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer"
            >
              <div>
                <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={act.image}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-xs">
                    {act.category}
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-200/60 mt-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {act.category}
                </span>
                <div className="w-7 h-7 rounded-full bg-white border border-slate-200 group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:text-white text-slate-700 flex items-center justify-center transition-all shadow-xs">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

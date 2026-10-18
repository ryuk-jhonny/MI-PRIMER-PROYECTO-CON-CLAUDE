import { ArrowUpRight, ArrowRight } from 'lucide-react';

interface ProgramsGridProps {
  onScrollToSimulator: () => void;
  onOpenDemoModal: () => void;
  onSelectModule?: (moduleId: string) => void;
}

export default function ProgramsGrid({ onScrollToSimulator, onOpenDemoModal, onSelectModule }: ProgramsGridProps) {
  const modules = [
    {
      id: 'portafolio',
      title: 'Planificación CNEB por área',
      badge: 'Para cada docente',
      description: 'Unidades y sesiones con las competencias y capacidades del área de cada docente, lista de cotejo lista para imprimir y visado de la dirección.',
      gradeRange: 'Escuelas y Colegios (Primaria & Secundaria)',
      image: '/img/teacher-digital-portfolio.webp',
      alt: 'Docente gestionando portafolios digitales en tableta',
    },
    {
      id: 'asistencia-qr',
      title: 'Control de Asistencia con QR',
      badge: 'Ingreso con QR',
      description: 'Carnet con QR seguro, lectura con la cámara del celular en la puerta o el aula y aviso por WhatsApp a la familia.',
      gradeRange: 'Toda la Comunidad Escolar',
      image: '/img/student-mobile-campus.webp',
      alt: 'Estudiante escaneando carnet QR en colegio',
    },
    {
      id: 'registro-notas',
      title: 'Notas por competencia',
      badge: 'Escala AD · A · B · C',
      description: 'Cada competencia del CNEB por periodo, promedio del área automático y libreta imprimible con conclusiones descriptivas.',
      gradeRange: 'Primaria y Secundaria',
      image: '/img/card-middle-students.webp',
      alt: 'Estudiantes de secundaria consultando libreta de notas en tablet',
    },
    {
      id: 'acompanamiento',
      title: 'Estudiantes y familias conectados',
      badge: 'Retroalimentación',
      description: 'Actividades publicadas por los docentes, respuestas desde el celular, retroalimentación y comunicados del colegio.',
      gradeRange: 'Toda la comunidad educativa',
      image: '/img/card-primary-students.webp',
      alt: 'Estudiantes de primaria trabajando en equipo con materiales didácticos',
    },
  ];

  return (
    <section id="modulos" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header matching reference */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">
              MÓDULOS DE GESTIÓN ESCOLAR
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight">
              Bases Sólidas para una Gestión Escolar Moderna
            </h2>
          </div>

          <div className="flex flex-col items-start md:items-end space-y-2">
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm text-left md:text-right leading-relaxed">
              Diseñado para directores, docentes y familias que buscan máxima puntualidad, orden pedagógico y transparencia académica.
            </p>
            <button
              onClick={onScrollToSimulator}
              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Simulador en Vivo</span>
              <ArrowRight className="w-4 h-4 text-orange-500" />
            </button>
          </div>
        </div>

        {/* 4 Cards Grid exactly like reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((item) => (
            <div
              key={item.id}
              id={item.id}
              onClick={() => {
                if (onSelectModule) {
                  onSelectModule(item.id);
                } else {
                  onScrollToSimulator();
                }
              }}
              className="group rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer scroll-mt-28"
            >
              <div>
                {/* Card Image */}
                <div className="relative aspect-4/3 overflow-hidden bg-slate-200">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-xs">
                    {item.badge}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Card Footer with circular arrow button matching reference */}
              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-200/60 mt-3 pt-3">
                <span className="text-[11px] font-semibold text-slate-500">
                  {item.gradeRange}
                </span>
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:text-white text-slate-700 flex items-center justify-center transition-all shadow-xs">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

import { QrCode, ScanLine, CloudLightning, Smartphone } from 'lucide-react';

export default function HowQrWorks() {
  const steps = [
    {
      step: '01',
      title: 'Emisión del Carnet QR',
      description: 'Ryuk genera automáticamente credenciales digitales y físicas con códigos QR encriptados únicos para cada estudiante matriculado.',
      icon: QrCode,
      tag: 'Generación Inmediata',
    },
    {
      step: '02',
      title: 'Escaneo Rápido en Puerta / Aula',
      description: 'El alumno muestra su carnet al lector o a la tablet del auxiliar. En 0.4 segundos se valida su identidad sin cuellos de botella.',
      icon: ScanLine,
      tag: 'Al instante',
    },
    {
      step: '03',
      title: 'Sincronización en la Nube',
      description: 'La base de datos actualiza el porcentaje de asistencia al instante y despacha confirmaciones automáticas a los padres de familia.',
      icon: CloudLightning,
      tag: 'Tiempo Real',
    },
    {
      step: '04',
      title: 'Consulta Móvil Transparente',
      description: 'Desde cualquier celular, el estudiante o apoderado visualiza su reporte cronológico de asistencia y libreta de notas actualizada.',
      icon: Smartphone,
      tag: 'Acceso en 1 Clic',
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-3">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Flujo de Trabajo Automatizado
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
            ¿Cómo Funciona el Ecosistema QR de Ryuk?
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Un circuito simple, ultra rápido y sin fricción tecnológica que transforma el control de ingreso y la comunicación académica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between hover:border-blue-400 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-300 font-mono tabular-nums">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

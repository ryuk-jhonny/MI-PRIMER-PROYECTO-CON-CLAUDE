import { QrCode, BookOpenCheck, Smartphone, FileSpreadsheet } from 'lucide-react';

/** Lo que Ryuk hace hoy, sin cifras de clientes hasta tener datos reales con fuente. */
export default function StatsNavyBanner() {
  const stats = [
    { value: 'QR', label: 'Asistencia con la cámara del celular', icon: QrCode },
    { value: 'CNEB', label: 'Notas AD · A · B · C y libretas', icon: BookOpenCheck },
    { value: '0 apps', label: 'Las familias solo escanean el carnet', icon: Smartphone },
    { value: 'Excel', label: 'Importa SIAGIE y exporta reportes', icon: FileSpreadsheet },
  ];

  return (
    <div className="bg-[#0b1329] text-white py-6 border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3.5 justify-center md:justify-start py-2 group">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 text-orange-400 flex items-center justify-center shrink-0 border border-slate-700/60 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-mono block">{item.value}</span>
                  <span className="text-xs text-slate-400 font-medium leading-tight block">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
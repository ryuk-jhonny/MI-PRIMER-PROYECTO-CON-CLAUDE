import { useState } from 'react';
import { ArrowRight, BookOpenCheck, Building2, GraduationCap, HeartHandshake, UserRound } from 'lucide-react';
import { AREAS, competenciasOf, LEVEL_LABEL, Level } from '../lib/cneb';
import { navigate } from '../lib/router';

const ROLES = [
  {
    icon: Building2, title: 'Dirección', tone: 'bg-orange-600',
    points: ['Matrícula, carnets QR y códigos de acceso', 'Asistencia del día en vivo y alertas de tutoría', 'Visado de unidades y sesiones', 'Comunicados para toda la comunidad'],
  },
  {
    icon: GraduationCap, title: 'Docentes de cada área', tone: 'bg-blue-600',
    points: ['Panel armado con las competencias de su área', 'Notas por competencia con promedio automático', 'Sesiones, unidades y lista de cotejo imprimibles', 'Educación Física: IMC y pruebas físicas'],
  },
  {
    icon: UserRound, title: 'Estudiantes', tone: 'bg-emerald-600',
    points: ['Sus notas por competencia y su asistencia', 'Actividades de sus docentes', 'Responden desde el celular', 'Reciben retroalimentación AD, A, B o C'],
  },
  {
    icon: HeartHandshake, title: 'Familias', tone: 'bg-purple-600',
    points: ['Una cuenta para todos sus hijos', 'Ingresos y tardanzas al instante', 'Libreta y comunicados del colegio', 'Sin cuenta: escanean el QR del carnet'],
  },
];

export default function CommunitySection() {
  const [level, setLevel] = useState<Level>('primaria');
  const areas = AREAS.filter((a) => competenciasOf(a.name, level).length);

  return (
    <section id="comunidad" className="py-20 bg-slate-50 border-b border-slate-200 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div>
          <div className="max-w-3xl space-y-2 mb-10">
            <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">Toda la comunidad educativa</span>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight">Cada persona entra a su propio espacio</h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Una sola plataforma con cuatro miradas. Cada rol ve y hace solo lo que le corresponde, con reglas de seguridad en la base de datos.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES.map((r) => (
              <div key={r.title} className="spotlight group rounded-2xl bg-white border border-slate-200/90 p-6 hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 transition-all">
                <span className={`w-12 h-12 rounded-xl ${r.tone} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}><r.icon className="w-6 h-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{r.title}</h3>
                <ul className="mt-3 space-y-2">
                  {r.points.map((p) => <li key={p} className="text-xs sm:text-sm text-slate-600 leading-relaxed flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div id="areas-cneb" className="scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-extrabold tracking-[0.2em] text-orange-600 uppercase">Currículo Nacional (CNEB)</span>
              <h2 className="font-serif-title text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">Todas las áreas, con sus competencias</h2>
              <p className="text-sm text-slate-600">No solo Educación Física: cada docente elige sus áreas y su panel se arma con sus competencias y capacidades oficiales.</p>
            </div>
            <div className="flex gap-1 p-1 rounded-full bg-white border border-slate-200 shadow-xs self-start md:self-auto" role="tablist" aria-label="Nivel">
              {(['primaria', 'secundaria'] as Level[]).map((l) => (
                <button key={l} type="button" role="tab" aria-selected={level === l} onClick={() => setLevel(l)}
                  className={`h-11 px-6 rounded-full text-sm font-bold cursor-pointer transition-all ${level === l ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}>
                  {LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
          </div>
          <div key={level} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up">
            {areas.map((a) => {
              const comps = competenciasOf(a.name, level);
              return (
                <div key={a.name} className="spotlight group rounded-2xl bg-white border border-slate-200/90 p-5 hover:border-orange-300 hover:shadow-lg transition-all">
                  <span className={`block h-1.5 w-10 rounded-full bg-gradient-to-r ${a.tone} group-hover:w-16 transition-all duration-300`} />
                  <h3 className="mt-3 font-bold text-slate-900">{a.name}</h3>
                  <ul className="mt-2 space-y-1">
                    {comps.map((c) => <li key={c.id} className="text-[11px] text-slate-500 leading-snug">C{c.n} · {c.name}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button type="button" onClick={() => navigate('/app#crear')} className="inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-bold text-white bg-orange-700 hover:bg-orange-800 rounded-full shadow-lg shadow-orange-700/25 active:scale-[0.98] transition-all cursor-pointer">
              Registrar mi colegio <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-slate-500 flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-orange-600" /> Empiezas con tu colegio vacío: tú registras a tus estudiantes y docentes.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

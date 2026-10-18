import { useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, CalendarCheck, Clock, KeyRound, Loader2, Megaphone, ShieldAlert, UserX } from 'lucide-react';
import { Student, StudentCourseGrade } from '../types/education';
import { doc, getDoc } from 'firebase/firestore';
import { cloudEnabled, fb } from '../lib/firebase';
import { LogoMark } from '../app/Logo';
import { formatDay, levelOf } from '../lib/school';
import { navigate } from '../lib/router';

interface PortalData {
  student: Pick<Student, 'fullName' | 'gradeLevel' | 'section' | 'avatarUrl' | 'grades'>;
  counters: { present: number; late: number; absent: number; justified: number };
  institution: { name: string; shortName?: string; academicYear?: string; activePeriod?: string; periodType?: string };
  attendance: { day: string; time: string | null; status: string }[];
  announcements: { body: string; author: string; at: string; audience?: string }[];
}

/** Lee la copia pública del carnet (sin DNI, dirección ni teléfono). */
async function loadPortal(token: string): Promise<PortalData | null> {
  const { db } = fb();
  const snap = await getDoc(doc(db, 'portals', token));
  if (!snap.exists()) return null;
  const d = snap.data() as {
    institutionId: string; student?: PortalData['student']; institution?: PortalData['institution'];
    att?: Record<string, { t: string; s: string }>;
  };
  if (!d.student) return null;
  const attendance = Object.entries(d.att || {}).map(([day, v]) => ({ day, time: v.t || null, status: v.s })).sort((a, b) => b.day.localeCompare(a.day));
  const counters = { present: 0, late: 0, absent: 0, justified: 0 };
  attendance.forEach((a) => {
    if (a.status === 'Puntual') counters.present++;
    else if (a.status === 'Tardanza') counters.late++;
    else if (a.status === 'Inasistencia') counters.absent++;
    else counters.justified++;
  });
  let announcements: PortalData['announcements'] = [];
  try {
    const b = await getDoc(doc(db, 'boards', d.institutionId));
    if (b.exists()) {
      const level = levelOf({ gradeLevel: d.student.gradeLevel });
      announcements = ((b.data().announcements || []) as PortalData['announcements']).filter((a) => !a.audience || a.audience === 'all' || a.audience === level);
    }
  } catch { /* los comunicados son opcionales */ }
  return { student: d.student, institution: d.institution || { name: '' }, counters, attendance: attendance.slice(0, 60), announcements };
}

const STATUS: Record<string, string> = {
  Puntual: 'bg-emerald-100 text-emerald-800',
  Tardanza: 'bg-amber-100 text-amber-800',
  Justificada: 'bg-sky-100 text-sky-800',
  Inasistencia: 'bg-rose-100 text-rose-800',
};
const LIT: Record<string, string> = { AD: 'bg-emerald-100 text-emerald-800', A: 'bg-sky-100 text-sky-800', B: 'bg-amber-100 text-amber-800', C: 'bg-rose-100 text-rose-800', '': 'bg-slate-100 text-slate-400' };

export default function FamilyPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'Reporte del estudiante · Ryuk';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'robots'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'noindex, nofollow');
    if (!cloudEnabled) { setData(null); return; }
    loadPortal(token).then(setData).catch(() => setData(null));
  }, [token]);

  if (data === undefined) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-orange-600" /> Cargando reporte…</div>;
  }
  if (data === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Carnet no encontrado</h1>
          <p className="text-sm text-slate-600">Este código no corresponde a un estudiante activo. Si el carnet es nuevo, consulta con la secretaría del colegio.</p>
        </div>
      </div>
    );
  }

  const { student: s, counters: c, institution: inst } = data;
  const total = c.present + c.late + c.absent + c.justified;
  const rate = total ? Math.round(((c.present + c.late + c.justified) / total) * 1000) / 10 : null;
  const n = inst.periodType === 'trimestral' ? 3 : 4;
  const grades: StudentCourseGrade[] = s.grades || [];
  const today = data.attendance[0];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="relative overflow-hidden bg-[#0f172a] text-white">
        <div aria-hidden="true" className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-orange-500/25 blur-3xl animate-orbit-1" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl animate-orbit-2" />
        <div className="relative max-w-xl mx-auto px-4 pt-5 pb-16 stagger">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <LogoMark className="w-6 h-6" /> <span className="truncate">{inst.shortName || inst.name}</span>
          </div>
          <div className="mt-5 flex items-center gap-4">
            {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover bg-slate-700" /> : <span className="w-16 h-16 rounded-2xl bg-slate-700" />}
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{s.fullName}</h1>
              <p className="text-sm text-slate-300">{s.gradeLevel} · Sección {s.section}</p>
              <p className="text-xs text-slate-400 mt-0.5">Año escolar {inst.academicYear}{inst.activePeriod ? ` · ${inst.activePeriod}` : ''}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-xl mx-auto px-4 -mt-10 pb-10 space-y-4 stagger">
        <section className="bg-white rounded-2xl shadow-sm p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-orange-900/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencia</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-4xl font-bold tabular-nums">{rate === null ? '—' : `${rate}%`}</p>
            {today && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS[today.status]}`}>
                Último: {formatDay(today.day)} {today.time ? `· ${today.time}` : ''} · {today.status}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-50"><CalendarCheck className="w-4 h-4 mx-auto text-emerald-700" /><p className="mt-1 text-lg font-bold text-emerald-800">{c.present}</p><p className="text-emerald-800">Puntual</p></div>
            <div className="p-3 rounded-xl bg-amber-50"><Clock className="w-4 h-4 mx-auto text-amber-700" /><p className="mt-1 text-lg font-bold text-amber-800">{c.late}</p><p className="text-amber-800">Tardanzas</p></div>
            <div className="p-3 rounded-xl bg-rose-50"><UserX className="w-4 h-4 mx-auto text-rose-700" /><p className="mt-1 text-lg font-bold text-rose-800">{c.absent}</p><p className="text-rose-800">Faltas</p></div>
          </div>
          {data.attendance.length > 0 && (
            <details className="mt-4 group">
              <summary className="text-sm font-semibold text-orange-700 cursor-pointer min-h-11 flex items-center">Ver historial de ingresos</summary>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {data.attendance.map((a) => (
                  <li key={a.day} className="py-2 flex items-center justify-between">
                    <span className="capitalize text-slate-700">{formatDay(a.day)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500 tabular-nums">{a.time || ''}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS[a.status]}`}>{a.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-orange-900/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><BookOpenCheck className="w-4 h-4" /> Calificaciones</p>
          {grades.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aún no hay calificaciones publicadas.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {grades.map((g) => {
                const units = [g.unit1, g.unit2, g.unit3, g.unit4].slice(0, n);
                return (
                  <li key={g.courseId} className="p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm">{g.courseName}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${LIT[g.average || '']}`}>{g.average || '—'}</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {units.map((u, i) => (
                        <span key={i} className={`flex-1 text-center py-1 rounded-lg text-xs font-bold ${LIT[u || '']}`}>
                          <span className="block text-[10px] font-medium opacity-70">{n === 3 ? 'T' : 'B'}{i + 1}</span>{u || '—'}
                        </span>
                      ))}
                    </div>
                    {g.recentFeedback && <p className="mt-2 text-xs text-slate-600">{g.recentFeedback}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-500">AD logro destacado · A logro esperado · B en proceso · C en inicio</p>
        </section>

        {data.announcements.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-orange-900/10">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Megaphone className="w-4 h-4" /> Comunicados del colegio</p>
            <ul className="mt-3 space-y-3">
              {data.announcements.map((a, i) => (
                <li key={i} className="p-3 rounded-xl bg-slate-50">
                  <p className="text-sm whitespace-pre-line">{a.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(a.at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} · {a.author}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="relative overflow-hidden rounded-2xl p-5 bg-[#0f172a] text-white shadow-lg">
          <div aria-hidden="true" className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-orange-500/30 blur-3xl animate-glow-slow" />
          <div className="relative flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="font-bold">¿Eres el estudiante o su familia?</p>
              <p className="text-sm text-slate-300 mt-0.5">Entra a la app completa con este carnet y tu PIN: notas por competencia, actividades y retroalimentación de los docentes.</p>
            </div>
          </div>
          <a href={`/app#carnet=${token}`} onClick={(e) => { e.preventDefault(); navigate(`/app#carnet=${token}`); }}
            className="btn-glow relative mt-4 h-12 w-full rounded-xl text-white font-bold inline-flex items-center justify-center gap-2">
            Entrar con mi PIN <ArrowRight className="w-4 h-4" />
          </a>
        </section>

        <p className="text-center text-[11px] text-slate-500 px-4">
          Información privada del estudiante. No compartas este enlace ni la foto del carnet. Si lo perdiste, pide a la dirección un carnet nuevo.
        </p>
      </main>
    </div>
  );
}

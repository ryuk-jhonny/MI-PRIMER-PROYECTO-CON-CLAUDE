import { useEffect, useState } from 'react';
import { BookOpenCheck, CalendarCheck, Clock, Loader2, Megaphone, ShieldAlert, UserX } from 'lucide-react';
import { Student, StudentCourseGrade } from '../types/education';
import { supabase, cloudEnabled } from '../lib/supabase';
import { AttendanceRecord, Announcement, tokenFromQr } from '../lib/store';
import { LogoMark } from '../app/Logo';
import { formatDay } from '../lib/school';

interface PortalData {
  student: Student;
  counters: { present: number; late: number; absent: number; justified: number };
  institution: { name: string; shortName?: string; academicYear?: string; activePeriod?: string; periodType?: string };
  attendance: { day: string; time: string | null; status: string }[];
  announcements: { body: string; author: string; at: string }[];
}

function loadDemo(token: string): PortalData | null {
  try {
    const students = JSON.parse(localStorage.getItem('ryuk_demo_students') || '[]') as Student[];
    const st = students.find((s) => tokenFromQr(s.qrCodeValue) === token);
    if (!st) return null;
    const cfg = JSON.parse(localStorage.getItem('ryuk_demo_config') || 'null') || {};
    const recs = (JSON.parse(localStorage.getItem('ryuk_demo_attendance') || '[]') as AttendanceRecord[]).filter((r) => r.studentId === st.id).sort((a, b) => b.day.localeCompare(a.day));
    const anns = JSON.parse(localStorage.getItem('ryuk_demo_announcements') || '[]') as Announcement[];
    return {
      student: st,
      counters: { present: st.presentDays, late: st.lateDays, absent: st.absentDays, justified: Math.max(0, st.totalDays - st.presentDays - st.lateDays - st.absentDays) },
      institution: { name: cfg.institutionName || 'Colegio de demostración', shortName: cfg.shortName, academicYear: cfg.academicYear || String(new Date().getFullYear()), activePeriod: cfg.activePeriod, periodType: cfg.periodType },
      attendance: recs.slice(0, 40).map((r) => ({ day: r.day, time: r.time?.slice(0, 5) || null, status: r.status })),
      announcements: anns.slice(0, 10).map((a) => ({ body: a.body, author: a.authorName, at: a.createdAt })),
    };
  } catch {
    return null;
  }
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
    (async () => {
      const demo = loadDemo(token);
      if (demo) { setData(demo); return; }
      if (cloudEnabled && supabase) {
        const { data: res, error } = await supabase.rpc('get_family_portal', { p_token: token });
        setData(error ? null : (res as PortalData | null));
      } else setData(null);
    })();
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
      <header className="bg-[#0f172a] text-white">
        <div className="max-w-xl mx-auto px-4 pt-5 pb-16">
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

      <main className="max-w-xl mx-auto px-4 -mt-10 pb-10 space-y-4">
        <section className="bg-white rounded-2xl shadow-sm p-5">
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

        <section className="bg-white rounded-2xl shadow-sm p-5">
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
          <section className="bg-white rounded-2xl shadow-sm p-5">
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

        <p className="text-center text-[11px] text-slate-500 px-4">
          Información privada del estudiante. No compartas este enlace ni la foto del carnet. Si lo perdiste, pide a la dirección un carnet nuevo.
        </p>
      </main>
    </div>
  );
}

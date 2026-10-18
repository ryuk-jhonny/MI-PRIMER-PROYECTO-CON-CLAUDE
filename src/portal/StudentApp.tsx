import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, BookOpenCheck, CalendarCheck, CheckCircle2, ClipboardList, Clock, Home, LogOut, Megaphone, Send, TriangleAlert, UserX } from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import { Announcement, AttendanceRecord, createFamilyStore, FitnessRecord, ROLE_LABEL, Task, TaskResponse, UserProfile } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { competenciasOf, COMPETENCIAS } from '../lib/cneb';
import { aulaOf, CNEB_AREAS, compUnitsOf, findGrade, formatDay, levelOf, LITERAL_STYLE, periodCount, periodLabel, statusOf, unitsOf, overallLiteral } from '../lib/school';
import { AppBackdrop, Badge, btn, Card, Empty, Modal, PageHeader, Stat, STATUS_STYLE, textarea } from '../panel/ui';
import FullLoader from '../app/FullLoader';
import Logo from '../app/Logo';

type Tab = 'inicio' | 'notas' | 'asistencia' | 'actividades' | 'comunicados';
const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'notas', label: 'Notas', icon: BookOpenCheck },
  { id: 'asistencia', label: 'Asistencia', icon: CalendarCheck },
  { id: 'actividades', label: 'Actividades', icon: ClipboardList },
  { id: 'comunicados', label: 'Comunicados', icon: Megaphone },
];

export default function StudentApp({ me, onLogout }: { me: UserProfile; onLogout: () => void }) {
  const [profile] = useState(me);
  const store = useMemo(() => createFamilyStore(profile), [profile]);
  const [data, setData] = useState<Awaited<ReturnType<typeof store.load>> | null>(null);
  const [error, setError] = useState('');
  const [sid, setSid] = useState(me.studentIds?.[0] || '');
  const [tab, setTab] = useState<Tab>('inicio');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await store.load());
    } catch (err) {
      // Con carnet, un permiso negado significa que la dirección generó un QR nuevo.
      const denied = (err as { code?: string })?.code === 'permission-denied';
      setError(profile.carnetToken && denied
        ? 'Este carnet ya no está vigente: la dirección generó uno nuevo. Escanea tu carnet nuevo y actívalo otra vez.'
        : friendlyError(err));
    }
  }, [store, profile.carnetToken]);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <TriangleAlert className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-slate-200">No pudimos cargar tu información.</p>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={load} className={btn.primary}>Reintentar</button>
            <button type="button" onClick={onLogout} className={btn.secondary}>Salir</button>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <FullLoader label="Cargando…" />;

  const student = data.students.find((s) => s.id === sid) || data.students[0];
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };

  return (
    <div className="relative isolate min-h-screen text-slate-100 pb-24 lg:pb-10">
      <AppBackdrop />
      <header className="sticky top-0 z-30 bg-[#0b1222]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <span className="anim-rise"><Logo className="h-8" light /></span>
          <div className="flex items-center gap-2 min-w-0 anim-rise">
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile.carnetToken && student ? (profile.role === 'familia' ? `Familia de ${student.fullName}` : student.fullName) : profile.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">{ROLE_LABEL[profile.role]} · {data.institution.shortName || data.institution.name}</p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Cerrar sesión" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors cursor-pointer"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        <nav aria-label="Secciones" className="hidden lg:block max-w-5xl mx-auto px-4">
          <div className="flex gap-1 pb-2">
            {NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={tab === n.id ? 'page' : undefined}
                className={`nav-item relative h-10 px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${tab === n.id ? 'text-white' : 'text-slate-300 hover:bg-slate-800/70'}`}>
                {tab === n.id && <motion.span layoutId="student-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg shadow-orange-600/30" />}
                <n.icon className="relative w-4 h-4" /> <span className="relative">{n.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>

      <AnimatePresence mode="wait" initial={false}>
      <motion.main key={`${tab}-${student?.id}`} className="max-w-5xl mx-auto px-4 py-6 space-y-6"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
        {profile.role === 'familia' && data.students.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
            {data.students.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.id === student?.id} onClick={() => setSid(s.id)}
                className={`h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${s.id === student?.id ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {s.fullName.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        )}

        {!student ? (
          <Empty icon={UserX} title="No encontramos al estudiante">Es posible que el colegio lo haya retirado. Consulta con la dirección.</Empty>
        ) : (
          <>
            {tab === 'inicio' && <Overview store={store} student={student} config={data.config} go={go} />}
            {tab === 'notas' && <Grades student={student} config={data.config} />}
            {tab === 'asistencia' && <AttendanceView store={store} student={student} />}
            {tab === 'actividades' && <Tasks store={store} student={student} canAnswer />}
            {tab === 'comunicados' && <Announcements store={store} student={student} />}
          </>
        )}
      </motion.main>
      </AnimatePresence>

      <nav aria-label="Accesos rápidos" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0b1222]/90 backdrop-blur-xl border-t border-slate-800 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={tab === n.id ? 'page' : undefined}
            className={`relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${tab === n.id ? 'text-orange-400' : 'text-slate-400'}`}>
            {tab === n.id && <motion.span layoutId="student-bottom-pill" className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_12px_rgba(249,115,22,.8)]" />}
            <n.icon className={`w-5 h-5 transition-transform duration-300 ${tab === n.id ? '-translate-y-0.5 scale-110' : ''}`} /> {n.label}
          </button>
        ))}
      </nav>

    </div>
  );
}

type FStore = ReturnType<typeof createFamilyStore>;

function Overview({ store, student: s, config, go }: { store: FStore; student: Student; config: InstitutionConfig; go: (t: Tab) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fitness, setFitness] = useState<FitnessRecord | null>(null);
  useEffect(() => {
    store.listTasks(aulaOf(s)).then(setTasks).catch(() => setTasks([]));
    store.listFitness(s.id).then((l) => setFitness(l[0] || null)).catch(() => setFitness(null));
  }, [store, s]);
  const overall = overallLiteral(s);
  return (
    <div className="space-y-6 stagger">
      <PageHeader title={s.fullName} subtitle={`${s.gradeLevel} · Sección ${s.section} · ${config.academicYear} · ${config.activePeriod}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Asistencia" value={s.totalDays ? `${s.attendanceRate}%` : '—'} hint={`${s.totalDays} días registrados`} icon={CalendarCheck} tone="emerald" />
        <Stat label="Tardanzas" value={s.lateDays} hint={`Puntual hasta las ${config.punctualCutoffTime}`} icon={Clock} tone="amber" />
        <Stat label="Faltas" value={s.absentDays} hint={s.justifiedDays ? `${s.justifiedDays} justificadas` : 'sin justificadas'} icon={UserX} tone="rose" />
        <Stat label="Logro general" value={overall || '—'} hint={overall ? statusOf(overall) : 'Sin calificaciones aún'} icon={BookOpenCheck} tone="sky" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-white">Actividades</h2><button type="button" onClick={() => go('actividades')} className={btn.ghost}>Ver todas</button></div>
          {tasks.length === 0 ? <p className="mt-2 text-sm text-slate-400">No hay actividades publicadas para tu aula.</p> : (
            <ul className="mt-2 divide-y divide-slate-800">{tasks.slice(0, 4).map((t) => <li key={t.id} className="py-2.5"><p className="text-sm font-semibold text-white">{t.title}</p><p className="text-xs text-slate-400">{t.area}{t.dueDate ? ` · entrega ${formatDay(t.dueDate)}` : ''}</p></li>)}</ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-white">Áreas</h2><button type="button" onClick={() => go('notas')} className={btn.ghost}>Ver notas</button></div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {CNEB_AREAS[levelOf(s)].map((a) => {
              const g = findGrade(s, a);
              return <li key={a} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"><span className="text-xs text-slate-300 truncate">{a}</span><Badge className={LITERAL_STYLE[g?.average || '']}>{g?.average || '—'}</Badge></li>;
            })}
          </ul>
          {fitness && <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5"><Activity className="w-4 h-4 text-emerald-400" /> Última evaluación física ({fitness.date}): {fitness.weightKg} kg · {fitness.heightCm} cm · IMC {fitness.imc}</p>}
        </Card>
      </div>
    </div>
  );
}

function Grades({ student: s, config }: { student: Student; config: InstitutionConfig }) {
  const n = periodCount(config);
  const level = levelOf(s);
  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Notas por competencia" subtitle="AD logro destacado · A logro esperado · B en proceso · C en inicio" />
      {CNEB_AREAS[level].map((a) => {
        const g = findGrade(s, a);
        const comps = competenciasOf(a, level);
        return (
          <Card key={a} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-white">{a}</h2>
              <Badge className={LITERAL_STYLE[g?.average || '']}>{g?.average || '—'}</Badge>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs min-w-[420px]">
                <thead><tr className="text-slate-400"><th className="text-left font-semibold py-1.5">Competencia</th>{Array.from({ length: n }, (_, i) => <th key={i} className="font-semibold py-1.5 w-14">{periodLabel(config, i)}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {comps.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-2 text-slate-300">{c.name}</td>
                      {compUnitsOf(g, c.id, n).map((v, i) => <td key={i} className="py-2 text-center"><span className={`inline-block min-w-9 px-1.5 py-0.5 rounded-md border font-bold ${LITERAL_STYLE[v]}`}>{v || '—'}</span></td>)}
                    </tr>
                  ))}
                  <tr className="font-bold"><td className="py-2 text-white">Área</td>{unitsOf(g, n).map((v, i) => <td key={i} className="py-2 text-center text-white">{v || '—'}</td>)}</tr>
                </tbody>
              </table>
            </div>
            {g?.recentFeedback && <p className="mt-3 text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3">{g.recentFeedback}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function AttendanceView({ store, student }: { store: FStore; student: Student }) {
  const [list, setList] = useState<AttendanceRecord[] | null>(null);
  useEffect(() => { store.listAttendance(student.id).then(setList).catch(() => setList([])); }, [store, student.id]);
  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Asistencia" subtitle={`${student.presentDays} puntual · ${student.lateDays} tardanzas · ${student.absentDays} faltas · ${student.justifiedDays || 0} justificadas`} />
      {list === null ? <p className="text-sm text-slate-400">Cargando…</p> : list.length === 0 ? <Empty icon={CalendarCheck} title="Sin registros todavía">Aquí verás cada ingreso registrado con el carnet.</Empty> : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-800">
            {list.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-200 capitalize">{formatDay(r.day)}</span>
                <span className="flex items-center gap-2"><span className="text-xs text-slate-400 tabular-nums">{r.time?.slice(0, 5) || ''}</span><Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Tasks({ store, student, canAnswer }: { store: FStore; student: Student; canAnswer: boolean }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [responses, setResponses] = useState<Record<string, TaskResponse | null>>({});
  const [answering, setAnswering] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await store.listTasks(aulaOf(student));
      setTasks(list);
      const entries = await Promise.all(list.map(async (t) => [t.id, await store.getResponse(t.id, student.id).catch(() => null)] as const));
      setResponses(Object.fromEntries(entries));
    } catch { setTasks([]); }
  }, [store, student]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Actividades" subtitle={`Publicadas por tus docentes para ${aulaOf(student)}.`} />
      {tasks === null ? <p className="text-sm text-slate-400">Cargando…</p> : tasks.length === 0 ? <Empty icon={ClipboardList} title="No hay actividades">Cuando un docente publique una actividad para tu aula aparecerá aquí.</Empty> : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((t) => {
            const r = responses[t.id];
            const comp = t.competencia ? COMPETENCIAS[Number(t.competencia.slice(1))] : null;
            return (
              <Card key={t.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-orange-300 font-semibold">{t.area} · {t.ownerName}</p>
                    <h3 className="font-bold text-white mt-1">{t.title}</h3>
                  </div>
                  {r ? <Badge className={r.reviewedAt ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'}>{r.reviewedAt ? 'Revisado' : 'Entregado'}</Badge> : <Badge className="bg-slate-800 text-slate-300 border-slate-700">Pendiente</Badge>}
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-line">{t.instructions}</p>
                {comp && <p className="text-xs text-slate-400">Competencia: {comp.name}</p>}
                {t.dueDate && <p className="text-xs text-slate-400">Entrega: {formatDay(t.dueDate)}</p>}
                {r?.reviewedAt && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
                    <p className="font-semibold text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Retroalimentación {r.literal && <Badge className={LITERAL_STYLE[r.literal]}>{r.literal}</Badge>}</p>
                    {r.feedback && <p className="mt-1 text-emerald-100/90">{r.feedback}</p>}
                  </div>
                )}
                {canAnswer && <button type="button" onClick={() => setAnswering(t)} className={`${r ? btn.secondary : btn.primary} mt-auto`}><Send className="w-4 h-4" /> {r ? 'Editar mi respuesta' : 'Responder'}</button>}
              </Card>
            );
          })}
        </div>
      )}
      {answering && (
        <AnswerModal task={answering} initial={responses[answering.id]?.text || ''} onClose={() => setAnswering(null)}
          onSend={async (text) => { await store.submitResponse(answering.id, student, text); setAnswering(null); load(); }} />
      )}
    </div>
  );
}

function AnswerModal({ task, initial, onClose, onSend }: { task: Task; initial: string; onClose: () => void; onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await onSend(text.trim()); } catch (err) { setError(friendlyError(err)); }
    setBusy(false);
  };
  return (
    <Modal title={task.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} required maxLength={5000} className={textarea} placeholder="Escribe tu respuesta. Si hiciste un trabajo en papel, cuéntale a tu docente qué hiciste y qué aprendiste." aria-label="Tu respuesta" />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button><button type="submit" disabled={busy || !text.trim()} className={btn.primary}><Send className="w-4 h-4" /> Enviar</button></div>
      </form>
    </Modal>
  );
}

function Announcements({ store, student }: { store: FStore; student: Student }) {
  const [list, setList] = useState<Announcement[] | null>(null);
  useEffect(() => { store.listAnnouncements().then(setList).catch(() => setList([])); }, [store]);
  const level = levelOf(student);
  const visible = (list || []).filter((a) => a.audience === 'all' || a.audience === level);
  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Comunicados" />
      {list === null ? <p className="text-sm text-slate-400">Cargando…</p> : visible.length === 0 ? <Empty icon={Megaphone} title="Sin comunicados">Los comunicados del colegio aparecerán aquí.</Empty> : visible.map((a) => (
        <Card key={a.id} className="p-5">
          <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })} · {a.authorName}</p>
          <p className="mt-2 text-slate-100 whitespace-pre-line">{a.body}</p>
        </Card>
      ))}
    </div>
  );
}

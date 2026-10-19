import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, BookOpenCheck, CalendarCheck, CheckCircle2, ClipboardList, Clock, Home, LogOut, Megaphone, Send, TriangleAlert, UserX } from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import { Announcement, AttendanceRecord, ClassMark, createFamilyStore, FitnessRecord, ROLE_LABEL, Task, TaskResponse, UserProfile } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { competenciasOf, COMPETENCIAS } from '../lib/cneb';
import { aulaOf, CNEB_AREAS, compUnitsOf, findGrade, formatDay, levelOf, LITERAL_STYLE, periodCount, periodLabel, statusOf, unitsOf, overallLiteral } from '../lib/school';
import { AppBackdrop, Badge, btn, Card, Empty, input, Modal, PageHeader, Stat, STATUS_STYLE, textarea } from '../panel/ui';
import { LiteralBar, LiteralLegend } from '../panel/DashboardTab';
import FullLoader from '../app/FullLoader';
import Logo from '../app/Logo';
import { bellSlots, dayName, nowIn, OwnedBlock, sortBlocks } from '../lib/schedule';
import { Week } from '../panel/ScheduleTab';
import { EASE_OUT, ScrollProgressBar, useAutoReveal, useSpotlight } from '../lib/motionKit';

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
  const mainRef = useRef<HTMLElement>(null);
  useSpotlight();
  useAutoReveal(mainRef, `${tab}-${sid}-${!!data}`, ':scope > *, :scope > * > *');

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
      <ScrollProgressBar />
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
      <motion.main ref={mainRef} key={`${tab}-${student?.id}`} className="max-w-5xl mx-auto px-4 py-6 space-y-6"
        initial={{ opacity: 0, y: 26, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, transition: { duration: 0.22, ease: 'easeIn' } }} transition={{ duration: 0.55, ease: EASE_OUT }}>
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
  const [blocks, setBlocks] = useState<OwnedBlock[]>([]);
  const [week, setWeek] = useState(false);
  useEffect(() => {
    store.listTasks(aulaOf(s)).then(setTasks).catch(() => setTasks([]));
    store.listSectionBlocks(aulaOf(s)).then(setBlocks).catch(() => setBlocks([]));
    store.listFitness(s.id).then((l) => setFitness(l[0] || null)).catch(() => setFitness(null));
  }, [store, s]);
  const overall = overallLiteral(s);
  // Clases de hoy; si hoy no hay (o es fin de semana), las del siguiente día con clases.
  const now = nowIn(config.timeZone);
  const sorted = sortBlocks(blocks);
  const showDay = sorted.some((b) => b.day === now.day) ? now.day : (sorted.find((b) => b.day > now.day) || sorted[0])?.day;
  const dayBlocks = sorted.filter((b) => b.day === showDay);
  return (
    <div className="space-y-6 stagger">
      <PageHeader title={s.fullName} subtitle={`${s.gradeLevel} · Sección ${s.section} · ${config.academicYear} · ${config.activePeriod}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Asistencia" value={s.totalDays ? `${s.attendanceRate}%` : '—'} hint={`${s.totalDays} días registrados`} icon={CalendarCheck} tone="emerald" />
        <Stat label="Tardanzas" value={s.lateDays} hint={`Puntual hasta las ${config.punctualCutoffTime}`} icon={Clock} tone="amber" />
        <Stat label="Faltas" value={s.absentDays} hint={s.justifiedDays ? `${s.justifiedDays} justificadas` : 'sin justificadas'} icon={UserX} tone="rose" />
        <Stat label="Logro general" value={overall || '—'} hint={overall ? statusOf(overall) : 'Sin calificaciones aún'} icon={BookOpenCheck} tone="sky" />
      </div>
      {blocks.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-white">{showDay === now.day ? 'Clases de hoy' : `Clases del ${dayName(showDay || 1).toLowerCase()}`}</h2>
            <button type="button" onClick={() => setWeek(true)} className={btn.ghost}>Ver semana</button>
          </div>
          <ul className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {dayBlocks.map((b) => (
              <li key={`${b.ownerUid}${b.id}`} className="shrink-0 min-w-36 rounded-xl p-3 bg-slate-950 border border-slate-800">
                <p className="text-[11px] font-mono text-orange-300">{b.start}–{b.end}</p>
                <p className="text-sm font-semibold text-white">{b.area}</p>
                <p className="text-xs text-slate-400 truncate">{b.ownerName}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {week && (
        <Modal title={`Horario de ${aulaOf(s)}`} onClose={() => setWeek(false)} wide>
          <Week blocks={blocks} slots={bellSlots(config.bell)} showOwner />
        </Modal>
      )}
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
  const [period, setPeriod] = useState(-1);
  const [area, setArea] = useState('');
  const areas = CNEB_AREAS[level];
  const shown = area ? [area] : areas;
  const periods = period < 0 ? Array.from({ length: n }, (_, i) => i) : [period];
  // Resumen: cuántas competencias tiene en AD, A, B y C en lo filtrado.
  const counts: Record<string, number> = {};
  shown.forEach((a) => competenciasOf(a, level).forEach((c) => periods.forEach((i) => { const v = compUnitsOf(findGrade(s, a), c.id, n)[i]; if (v) counts[v] = (counts[v] || 0) + 1; })));
  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Notas por competencia" subtitle="AD logro destacado · A logro esperado · B en proceso · C en inicio" />
      <Card className="p-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sg-period">Periodo</label>
          <select id="sg-period" value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={input}>
            <option value={-1}>Todo el año</option>{Array.from({ length: n }, (_, i) => <option key={i} value={i}>{periodLabel(config, i)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sg-area">Área</label>
          <select id="sg-area" value={area} onChange={(e) => setArea(e.target.value)} className={input}>
            <option value="">Todas</option>{areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <LiteralLegend />
        <LiteralBar counts={counts} label={`Competencias calificadas${period < 0 ? ' en el año' : ` en ${periodLabel(config, period)}`}`} />
      </Card>
      {shown.map((a) => {
        const g = findGrade(s, a);
        const comps = competenciasOf(a, level);
        return (
          <Card key={a} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-white">{a}</h2>
              <Badge className={LITERAL_STYLE[g?.average || '']}>{g?.average || '—'}</Badge>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs min-w-[320px]">
                <thead><tr className="text-slate-400"><th className="text-left font-semibold py-1.5">Competencia</th>{periods.map((i) => <th key={i} className="font-semibold py-1.5 w-14">{periodLabel(config, i)}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {comps.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-2 text-slate-300">C{c.n}. {c.name}</td>
                      {periods.map((i) => { const v = compUnitsOf(g, c.id, n)[i]; return <td key={i} className="py-2 text-center"><span className={`inline-block min-w-9 px-1.5 py-0.5 rounded-md border font-bold ${LITERAL_STYLE[v]}`}>{v || '—'}</span></td>; })}
                    </tr>
                  ))}
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

const MARK_NAME: Record<ClassMark, string> = { P: 'Presente', T: 'Tarde', F: 'Falta', J: 'Justificada' };
const MARK_TONE: Record<ClassMark, string> = { P: STATUS_STYLE.Puntual, T: STATUS_STYLE.Tardanza, F: STATUS_STYLE.Inasistencia, J: STATUS_STYLE.Justificada };

function AttendanceView({ store, student }: { store: FStore; student: Student }) {
  const [list, setList] = useState<AttendanceRecord[] | null>(null);
  const [marks, setMarks] = useState<{ day: string; area: string; mark: ClassMark }[] | null>(null);
  const [view, setView] = useState<'puerta' | 'clase'>('puerta');
  const [month, setMonth] = useState('');
  const [area, setArea] = useState('');
  useEffect(() => {
    store.listAttendance(student.id).then(setList).catch(() => setList([]));
    store.listClassMarks(student.id).then(setMarks).catch(() => setMarks([]));
  }, [store, student.id]);
  const months = [...new Set([...(list || []).map((r) => r.day.slice(0, 7)), ...(marks || []).map((m) => m.day.slice(0, 7))])].sort().reverse();
  const monthName = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const gate = (list || []).filter((r) => !month || r.day.startsWith(month));
  const cls = (marks || []).filter((m) => (!month || m.day.startsWith(month)) && (!area || m.area === area));
  const areas = [...new Set((marks || []).map((m) => m.area))].sort();
  const count = <T,>(l: T[], f: (x: T) => boolean) => l.filter(f).length;
  const rate = (ok: number, total: number) => (total ? `${Math.round((ok / total) * 100)}%` : '—');
  return (
    <div className="space-y-4 stagger">
      <PageHeader title="Asistencia" subtitle="La de la puerta (con el carnet) y la de cada clase." />
      <div className="flex gap-2">
        {(['puerta', 'clase'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer ${view === v ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{v === 'puerta' ? 'Puerta' : 'Clases'}</button>
        ))}
      </div>
      <Card className={`p-4 grid gap-3 ${view === 'clase' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sa-month">Mes</label>
          <select id="sa-month" value={month} onChange={(e) => setMonth(e.target.value)} className={input}>
            <option value="">Todo el año</option>{months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </div>
        {view === 'clase' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="sa-area">Área</label>
            <select id="sa-area" value={area} onChange={(e) => setArea(e.target.value)} className={input}>
              <option value="">Todas</option>{areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        )}
      </Card>
      {view === 'puerta' ? (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Asistencia" value={rate(count(gate, (r) => r.status !== 'Inasistencia'), gate.length)} hint={gate.length === 1 ? '1 día' : `${gate.length} días`} icon={CalendarCheck} tone="emerald" />
          <Stat label="Puntual" value={count(gate, (r) => r.status === 'Puntual')} icon={CheckCircle2} tone="sky" />
          <Stat label="Tardanzas" value={count(gate, (r) => r.status === 'Tardanza')} icon={Clock} tone="amber" />
          <Stat label="Faltas" value={count(gate, (r) => r.status === 'Inasistencia')} hint={`${count(gate, (r) => r.status === 'Justificada')} justificadas`} icon={UserX} tone="rose" />
        </div>
        {list === null ? <p className="text-sm text-slate-400">Cargando…</p> : gate.length === 0 ? <Empty icon={CalendarCheck} title="Sin registros">Aquí verás cada ingreso registrado con el carnet.</Empty> : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-800">
              {gate.map((r) => (
                <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-200 capitalize">{formatDay(r.day)}</span>
                  <span className="flex items-center gap-2"><span className="text-xs text-slate-400 tabular-nums">{r.time?.slice(0, 5) || ''}</span><Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge></span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>) : (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Asistencia" value={rate(count(cls, (m) => m.mark !== 'F'), cls.length)} hint={cls.length === 1 ? '1 clase' : `${cls.length} clases`} icon={CalendarCheck} tone="emerald" />
          <Stat label="Presente" value={count(cls, (m) => m.mark === 'P')} icon={CheckCircle2} tone="sky" />
          <Stat label="Tarde" value={count(cls, (m) => m.mark === 'T')} icon={Clock} tone="amber" />
          <Stat label="Faltas" value={count(cls, (m) => m.mark === 'F')} hint={`${count(cls, (m) => m.mark === 'J')} justificadas`} icon={UserX} tone="rose" />
        </div>
        {marks === null ? <p className="text-sm text-slate-400">Cargando…</p> : cls.length === 0 ? <Empty icon={CalendarCheck} title="Sin registros">Aquí verás la asistencia que toma cada docente en su clase.</Empty> : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-800">
              {cls.map((m) => (
                <li key={`${m.day}${m.area}`} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-200"><span className="capitalize">{formatDay(m.day)}</span><span className="block text-xs text-slate-400">{m.area}</span></span>
                  <Badge className={MARK_TONE[m.mark]}>{MARK_NAME[m.mark]}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>)}
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

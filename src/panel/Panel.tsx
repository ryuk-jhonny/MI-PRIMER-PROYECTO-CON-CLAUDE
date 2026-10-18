import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, BookOpenCheck, CheckCircle2, ClipboardList, Compass, GraduationCap, Home, LogOut, Megaphone, Menu, NotebookPen, ScanLine, Settings, TriangleAlert, Users, X,
} from 'lucide-react';
import { Student } from '../types/education';
import { DirectorProfile, InstitutionConfig } from '../types/institution';
import {
  AttendanceRecord, AttendanceStatus, bumpCounters, createStaffStore, ROLE_LABEL, ScanResult, StaffRole, StaffStore, todayIn, tokenFromQr, UserProfile,
} from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { ALL_AREAS, areaInfo } from '../lib/cneb';
import FullLoader from '../app/FullLoader';
import Logo from '../app/Logo';
import HomeTab from './HomeTab';
import AttendanceTab from './AttendanceTab';
import GradesTab from './GradesTab';
import TeamTab from './TeamTab';
import AnnouncementsTab from './AnnouncementsTab';
import StudentsTab from './StudentsTab';
import SettingsTab from './SettingsTab';
import AreaTab from './AreaTab';
import PlanningTab from './PlanningTab';
import TasksTab from './TasksTab';
import FitnessTab from './FitnessTab';
import { AppBackdrop } from './ui';
import { EASE_OUT, ScrollProgressBar, useAutoReveal, useSpotlight } from '../lib/motionKit';

export type Tab = 'inicio' | 'asistencia' | 'estudiantes' | 'notas' | 'area' | 'planificacion' | 'actividades' | 'fisica' | 'equipo' | 'comunicados' | 'configuracion';

interface NavItem { id: Tab; label: string; icon: typeof Home; roles: StaffRole[]; needsFisica?: boolean }

const NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: Home, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'area', label: 'Mi área CNEB', icon: Compass, roles: ['docente'] },
  { id: 'asistencia', label: 'Asistencia QR', icon: ScanLine, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'estudiantes', label: 'Estudiantes', icon: Users, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'notas', label: 'Notas y libretas', icon: BookOpenCheck, roles: ['director', 'docente'] },
  { id: 'planificacion', label: 'Planificación', icon: NotebookPen, roles: ['director', 'docente'] },
  { id: 'actividades', label: 'Actividades', icon: ClipboardList, roles: ['director', 'docente'] },
  { id: 'fisica', label: 'Evaluación física', icon: Activity, roles: ['docente'], needsFisica: true },
  { id: 'equipo', label: 'Equipo docente', icon: GraduationCap, roles: ['director'] },
  { id: 'comunicados', label: 'Comunicados', icon: Megaphone, roles: ['director', 'docente'] },
  { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['director'] },
];

export interface Toast { id: number; kind: 'ok' | 'error'; text: string }

export interface PanelCtx {
  store: StaffStore;
  me: UserProfile;
  config: InstitutionConfig;
  profile: DirectorProfile;
  students: Student[];
  today: string;
  todayRecords: AttendanceRecord[];
  /** Áreas que esta persona puede calificar y planificar. */
  myAreas: string[];
  isDirector: boolean;
  toast: (text: string, kind?: Toast['kind']) => void;
  go: (t: Tab) => void;
  addStudents: (list: Student[], okMsg?: string) => Promise<void>;
  saveStudents: (list: Student[], okMsg?: string) => Promise<void>;
  removeStudent: (s: Student) => Promise<void>;
  replaceQr: (s: Student) => Promise<void>;
  updateConfig: (cfg: InstitutionConfig) => Promise<void>;
  updateProfile: (p: DirectorProfile) => Promise<void>;
  updateMe: (patch: Partial<UserProfile>) => Promise<void>;
  scan: (raw: string) => Promise<ScanResult>;
  registerStudent: (s: Student) => Promise<void>;
  setStatus: (rec: AttendanceRecord, status: AttendanceStatus) => Promise<void>;
  closeDay: () => Promise<void>;
}

export default function Panel({ me, onLogout }: { me: UserProfile; onLogout: () => void }) {
  const store = useMemo(() => createStaffStore(me), [me]);
  const [config, setConfig] = useState<InstitutionConfig | null>(null);
  const [profile, setProfile] = useState<DirectorProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [meState, setMeState] = useState<UserProfile>(me);
  const [loadError, setLoadError] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const role = me.role as StaffRole;
  const isDirector = role === 'director';
  const myAreas = isDirector ? ALL_AREAS : meState.areas || [];
  // La evaluación física es solo de quien enseña Educación Física, no de la dirección.
  const hasFisica = myAreas.some((a) => areaInfo(a)?.tool === 'fisica');
  const allowed = NAV.filter((n) => n.roles.includes(role) && (!n.needsFisica || hasFisica));
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace('#', '') as Tab;
    return allowed.some((n) => n.id === h) ? h : role === 'auxiliar' ? 'asistencia' : 'inicio';
  });

  const tz = config?.timeZone || 'America/Lima';
  const today = todayIn(tz);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3800);
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const d = await store.load();
      setConfig(d.config);
      setProfile(d.profile);
      setStudents(d.students);
    } catch (err) {
      setLoadError(friendlyError(err));
    }
  }, [store]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!config) return;
    return store.watchAttendance(today, setRecords, (e) => toast(friendlyError(e), 'error'));
  }, [config !== null, store, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (t: Tab) => {
    setTab(t);
    setMenuOpen(false);
    window.history.replaceState({}, '', `${window.location.pathname}#${t}`);
    window.scrollTo({ top: 0 });
  };

  const fail = (err: unknown) => {
    toast(`No se pudo guardar: ${friendlyError(err)}`, 'error');
    load();
  };

  const ctx: PanelCtx | null = useMemo(() => {
    if (!config || !profile) return null;
    const patchStudent = (id: string, fn: (s: Student) => Student) => setStudents((list) => list.map((s) => (s.id === id ? fn(s) : s)));
    const scan = async (raw: string): Promise<ScanResult> => {
      const token = tokenFromQr(raw);
      if (!token) return { ok: false, error: 'Este QR no es un carnet de Ryuk.' };
      try {
        const res = await store.registerScan(token, students);
        if (res.ok && !res.duplicate && res.student && res.status) patchStudent(res.student.id, (s) => bumpCounters(s, res.status!, 1));
        return res;
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    };
    return {
      store,
      me: meState,
      config,
      profile,
      students,
      today,
      todayRecords: records,
      myAreas,
      isDirector,
      toast,
      go,
      async addStudents(list, okMsg) {
        try {
          const saved = await store.addStudents(list);
          setStudents((cur) => [...saved, ...cur].sort((a, b) => a.fullName.localeCompare(b.fullName)));
          if (okMsg) toast(okMsg);
        } catch (err) { fail(err); }
      },
      async saveStudents(list, okMsg) {
        const ids = new Map(list.map((s) => [s.id, s]));
        setStudents((cur) => cur.map((s) => ids.get(s.id) || s));
        try { await store.updateStudents(list); if (okMsg) toast(okMsg); } catch (err) { fail(err); }
      },
      async removeStudent(s) {
        setStudents((cur) => cur.filter((x) => x.id !== s.id));
        try { await store.deleteStudent(s); toast('Estudiante retirado.'); } catch (err) { fail(err); }
      },
      async replaceQr(s) {
        try { const next = await store.replaceQr(s); patchStudent(s.id, () => next); toast('QR nuevo listo. El carnet anterior ya no funciona.'); } catch (err) { fail(err); }
      },
      async updateConfig(cfg) {
        setConfig(cfg);
        try { await store.saveConfig(cfg); toast('Configuración guardada.'); } catch (err) { fail(err); }
      },
      async updateProfile(p) {
        setProfile(p);
        try { await store.saveProfile(p); toast('Perfil actualizado.'); } catch (err) { fail(err); }
      },
      async updateMe(patch) {
        try { await store.updateMe(patch); setMeState((m) => ({ ...m, ...patch })); toast('Tus datos se guardaron.'); } catch (err) { toast(friendlyError(err), 'error'); }
      },
      scan,
      async registerStudent(s) {
        if (!tokenFromQr(s.qrCodeValue)) { toast('El alumno no tiene un QR válido.', 'error'); return; }
        const res = await scan(s.qrCodeValue);
        if (!res.ok) toast(res.error || 'No se pudo registrar.', 'error');
        else if (res.duplicate) toast(`${s.fullName} ya registró ingreso hoy (${res.status}, ${res.time?.slice(0, 5)}).`);
        else toast(`Ingreso registrado: ${s.fullName} · ${res.status} ${res.time?.slice(0, 5)}`);
      },
      async setStatus(rec, status) {
        try {
          await store.setAttendanceStatus(rec, status, students.find((s) => s.id === rec.studentId));
          patchStudent(rec.studentId, (s) => bumpCounters(bumpCounters(s, rec.status, -1), status, 1));
          toast(`Estado cambiado a ${status}.`);
        } catch (err) { toast(friendlyError(err), 'error'); }
      },
      async closeDay() {
        try {
          const n = await store.closeDay(today, students, records);
          const seen = new Set(records.map((r) => r.studentId));
          setStudents((cur) => cur.map((s) => (seen.has(s.id) ? s : bumpCounters(s, 'Inasistencia', 1))));
          toast(n ? `Se marcaron ${n} inasistencias del día.` : 'Todos los alumnos ya tienen registro hoy.');
        } catch (err) { toast(friendlyError(err), 'error'); }
      },
    };
  }, [config, profile, students, records, store, today, toast, meState, myAreas, isDirector]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <TriangleAlert className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-slate-200">No pudimos cargar los datos del colegio.</p>
          <p className="text-sm text-slate-400">{loadError}</p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={load} className="h-11 px-5 rounded-xl bg-orange-600 text-white font-bold cursor-pointer">Reintentar</button>
            <button type="button" onClick={onLogout} className="h-11 px-5 rounded-xl bg-slate-800 text-white cursor-pointer">Salir</button>
          </div>
        </div>
      </div>
    );
  }
  useSpotlight();
  useAutoReveal(mainRef, `${tab}-${!!ctx}`, ':scope > * > *');

  if (!ctx) return <FullLoader label="Cargando tu colegio…" />;

  const current = allowed.find((n) => n.id === tab) || allowed[0];
  const quick: Tab[] = role === 'docente' ? ['inicio', 'area', 'notas', 'asistencia'] : ['inicio', 'asistencia', 'estudiantes', 'notas'];
  const bottom = allowed.filter((n) => quick.includes(n.id)).slice(0, 4);

  // La píldora naranja se desliza hasta la sección activa (una por menú, para no cruzar animaciones).
  const navList = (where: 'side' | 'drawer') => (
    <nav aria-label="Secciones del panel" className="space-y-1">
      {allowed.map((n, i) => {
        const active = n.id === current.id;
        return (
          <motion.button key={n.id} type="button" onClick={() => go(n.id)} aria-current={active ? 'page' : undefined}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.035, duration: 0.35 }}
            className={`nav-item relative w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${active ? 'text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'}`}>
            {active && (
              <motion.span layoutId={`nav-pill-${where}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg shadow-orange-600/30" />
            )}
            <n.icon className="relative w-5 h-5 shrink-0" /> <span className="relative">{n.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );

  const Account = () => (
    <div className="space-y-2">
      <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
        <span className="relative w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center" aria-hidden="true">
          {meState.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </span>
        <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{meState.fullName}</p>
        <p className="text-xs text-slate-400 truncate">{ROLE_LABEL[role]}{role === 'docente' && myAreas.length ? ` · ${myAreas.length === 1 ? myAreas[0] : `${myAreas.length} áreas`}` : ''}</p>
        </div>
      </div>
      <button type="button" onClick={onLogout} className="nav-item w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-200 cursor-pointer transition-colors">
        <LogOut className="w-5 h-5" /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="relative isolate min-h-screen text-slate-100 lg:pl-64">
      <AppBackdrop />
      <ScrollProgressBar />
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-64 flex-col gap-6 p-4 bg-[#0b1222]/85 backdrop-blur-xl border-r border-slate-800/80">
        <button type="button" onClick={() => go('inicio')} className="px-2 pt-2 text-left cursor-pointer transition-transform hover:scale-[1.03] origin-left"><Logo className="h-8" light /></button>
        <div className="px-3 anim-rise">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Institución</p>
          <p className="text-sm font-bold text-white leading-snug mt-0.5">{ctx.config.shortName || ctx.config.institutionName}</p>
          <p className="text-xs text-slate-400 mt-0.5">Año {ctx.config.academicYear} · {ctx.config.activePeriod}</p>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">{navList('side')}</div>
        <Account />
      </aside>

      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-[#0b1222]/95 backdrop-blur border-b border-slate-800">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{ctx.config.shortName || ctx.config.institutionName}</p>
          <p className="text-[11px] text-slate-400 truncate">{current.label}</p>
        </div>
        <button type="button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)} className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-200 cursor-pointer">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <AnimatePresence>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <motion.button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="absolute right-0 inset-y-0 w-[86%] max-w-xs bg-[#0b1222] border-l border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo className="h-7" light />
              <button type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            {navList('drawer')}
            <div className="mt-auto"><Account /></div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
      <motion.main ref={mainRef} key={current.id} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-10"
        initial={{ opacity: 0, y: 26, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, transition: { duration: 0.22, ease: 'easeIn' } }} transition={{ duration: 0.55, ease: EASE_OUT }}>
        {current.id === 'inicio' && <HomeTab ctx={ctx} />}
        {current.id === 'area' && <AreaTab ctx={ctx} />}
        {current.id === 'asistencia' && <AttendanceTab ctx={ctx} />}
        {current.id === 'estudiantes' && <StudentsTab ctx={ctx} />}
        {current.id === 'notas' && <GradesTab ctx={ctx} />}
        {current.id === 'planificacion' && <PlanningTab ctx={ctx} />}
        {current.id === 'actividades' && <TasksTab ctx={ctx} />}
        {current.id === 'fisica' && <FitnessTab ctx={ctx} />}
        {current.id === 'equipo' && <TeamTab ctx={ctx} />}
        {current.id === 'comunicados' && <AnnouncementsTab ctx={ctx} />}
        {current.id === 'configuracion' && <SettingsTab ctx={ctx} />}
      </motion.main>
      </AnimatePresence>

      <nav aria-label="Accesos rápidos" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0b1222]/90 backdrop-blur-xl border-t border-slate-800 grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${bottom.length + 1}, minmax(0, 1fr))` }}>
        {bottom.map((n) => (
          <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={n.id === current.id ? 'page' : undefined}
            className={`relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${n.id === current.id ? 'text-orange-400' : 'text-slate-400'}`}>
            {n.id === current.id && <motion.span layoutId="bottom-pill" className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_12px_rgba(249,115,22,.8)]" />}
            <n.icon className={`w-5 h-5 transition-transform duration-300 ${n.id === current.id ? '-translate-y-0.5 scale-110' : ''}`} /> <span className="truncate max-w-full px-1">{n.label.split(' ')[0]}</span>
          </button>
        ))}
        <button type="button" onClick={() => setMenuOpen(true)} className="h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 cursor-pointer">
          <Menu className="w-5 h-5" /> Más
        </button>
      </nav>

      <div className="fixed z-[60] bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 space-y-2" aria-live="polite">
        <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`relative overflow-hidden px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-start gap-2.5 border ${t.kind === 'ok' ? 'bg-emerald-950 border-emerald-700 text-emerald-100' : 'bg-rose-950 border-rose-700 text-rose-100'}`}>
            {t.kind === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <TriangleAlert className="w-5 h-5 shrink-0 text-rose-400" />}
            <span>{t.text}</span>
            <span aria-hidden="true" className={`toast-bar absolute bottom-0 left-0 h-0.5 w-full ${t.kind === 'ok' ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`} style={{ animationDuration: t.kind === 'error' ? '7s' : '3.8s' }} />
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

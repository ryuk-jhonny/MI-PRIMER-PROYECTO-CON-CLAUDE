import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck, CheckCircle2, ExternalLink, GraduationCap, Home, LogOut, Megaphone, Menu, ScanLine, Settings, TriangleAlert, Users, X,
} from 'lucide-react';
import { Student, Teacher } from '../types/education';
import { DirectorProfile, InstitutionConfig } from '../types/institution';
import { AttendanceRecord, AttendanceStatus, DataStore, normalizeStudents, normalizeTeachers, ScanResult, todayIn, tokenFromQr, WorkspaceData, resetDemoData } from '../lib/store';
import { friendlyError } from '../lib/supabase';
import { navigate } from '../lib/router';
import FullLoader from '../app/FullLoader';
import Logo from '../app/Logo';
import HomeTab from './HomeTab';
import AttendanceTab from './AttendanceTab';
import GradesTab from './GradesTab';
import TeachersTab from './TeachersTab';
import AnnouncementsTab from './AnnouncementsTab';
import StudentsTab from './StudentsTab';
import SettingsTab from './SettingsTab';

export type Tab = 'inicio' | 'asistencia' | 'estudiantes' | 'notas' | 'docentes' | 'comunicados' | 'configuracion';

const NAV: { id: Tab; label: string; icon: typeof Home; roles: DataStore['role'][] }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'asistencia', label: 'Asistencia QR', icon: ScanLine, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'estudiantes', label: 'Estudiantes', icon: Users, roles: ['director', 'docente', 'auxiliar'] },
  { id: 'notas', label: 'Notas y libretas', icon: BookOpenCheck, roles: ['director', 'docente'] },
  { id: 'docentes', label: 'Docentes', icon: GraduationCap, roles: ['director'] },
  { id: 'comunicados', label: 'Comunicados', icon: Megaphone, roles: ['director', 'docente'] },
  { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['director'] },
];

const ROLE_LABEL = { director: 'Dirección', docente: 'Docente', auxiliar: 'Personal de puerta' };

export interface Toast { id: number; kind: 'ok' | 'error'; text: string }

export interface PanelCtx {
  store: DataStore;
  config: InstitutionConfig;
  profile: DirectorProfile;
  students: Student[];
  teachers: Teacher[];
  codes?: { teacher: string; staff: string };
  today: string;
  todayRecords: AttendanceRecord[];
  toast: (text: string, kind?: Toast['kind']) => void;
  go: (t: Tab) => void;
  updateStudents: (next: Student[], okMsg?: string) => void;
  updateTeachers: (next: Teacher[], okMsg?: string) => void;
  updateConfig: (cfg: InstitutionConfig) => void;
  updateProfile: (p: DirectorProfile) => void;
  scan: (raw: string) => Promise<ScanResult>;
  registerStudent: (s: Student) => Promise<void>;
  setStatus: (rec: AttendanceRecord, status: AttendanceStatus) => Promise<void>;
  closeDay: () => Promise<void>;
  refreshToday: () => Promise<void>;
  setCodes: (c: { teacher: string; staff: string }) => void;
}

export default function Panel({ store, onLogout }: { store: DataStore; onLogout: () => void }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const allowed = NAV.filter((n) => n.roles.includes(store.role));
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace('#', '') as Tab;
    return allowed.some((n) => n.id === h) ? h : store.role === 'auxiliar' ? 'asistencia' : 'inicio';
  });

  const tz = data?.config.timeZone || 'America/Lima';
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
      setData(d);
    } catch (err) {
      setLoadError(friendlyError(err));
    }
  }, [store]);

  const refreshToday = useCallback(async () => {
    try { setRecords(await store.listAttendance(todayIn(tz))); } catch { /* se reintenta en el próximo aviso */ }
  }, [store, tz]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    refreshToday();
    return store.subscribeAttendance(refreshToday);
  }, [data !== null, refreshToday, store]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const bumpCounters = (studentId: string, status: AttendanceStatus, delta: 1 | -1) => {
    setData((d) => d && {
      ...d,
      students: d.students.map((s) => {
        if (s.id !== studentId) return s;
        const present = s.presentDays + (status === 'Puntual' ? delta : 0);
        const late = s.lateDays + (status === 'Tardanza' ? delta : 0);
        const absent = s.absentDays + (status === 'Inasistencia' ? delta : 0);
        const total = s.totalDays + delta;
        const attended = total - absent;
        return { ...s, presentDays: present, lateDays: late, absentDays: absent, totalDays: total, attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0 };
      }),
    });
  };

  const ctx: PanelCtx | null = useMemo(() => {
    if (!data) return null;
    const scan = async (raw: string): Promise<ScanResult> => {
      const token = tokenFromQr(raw);
      if (!token) return { ok: false, error: 'Este QR no es un carnet de Ryuk.' };
      try {
        const res = await store.registerScan(token);
        if (res.ok && !res.duplicate && res.student && res.status) bumpCounters(res.student.id, res.status, 1);
        refreshToday();
        return res;
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    };
    return {
      store,
      config: data.config,
      profile: data.profile,
      students: data.students,
      teachers: data.teachers,
      codes: data.codes,
      today,
      todayRecords: records,
      toast,
      go,
      updateStudents(next, okMsg) {
        const norm = normalizeStudents(next);
        setData((d) => d && { ...d, students: norm });
        store.saveStudents(norm).then(() => okMsg && toast(okMsg)).catch(fail);
      },
      updateTeachers(next, okMsg) {
        const norm = normalizeTeachers(next);
        setData((d) => d && { ...d, teachers: norm });
        store.saveTeachers(norm).then(() => okMsg && toast(okMsg)).catch(fail);
      },
      updateConfig(cfg) {
        setData((d) => d && { ...d, config: cfg });
        store.saveConfig(cfg).catch(fail);
      },
      updateProfile(p) {
        setData((d) => d && { ...d, profile: p });
        store.saveProfile(p).then(() => toast('Perfil actualizado.')).catch(fail);
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
          await store.setAttendanceStatus(rec.id, status);
          bumpCounters(rec.studentId, rec.status, -1);
          bumpCounters(rec.studentId, status, 1);
          await refreshToday();
          toast(`Estado cambiado a ${status}.`);
        } catch (err) { toast(friendlyError(err), 'error'); }
      },
      async closeDay() {
        try {
          const n = await store.closeDay(today);
          await refreshToday();
          await load();
          toast(n ? `Se marcaron ${n} inasistencias del día.` : 'Todos los alumnos ya tienen registro hoy.');
        } catch (err) { toast(friendlyError(err), 'error'); }
      },
      refreshToday,
      setCodes(c) { setData((d) => d && { ...d, codes: c }); },
    };
  }, [data, records, store, today, toast, refreshToday, load]); // eslint-disable-line react-hooks/exhaustive-deps

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
  if (!ctx) return <FullLoader label="Cargando tu colegio…" />;

  const current = allowed.find((n) => n.id === tab) || allowed[0];
  const bottom = allowed.filter((n) => ['inicio', 'asistencia', 'estudiantes', 'notas'].includes(n.id)).slice(0, 4);

  const NavList = () => (
    <nav aria-label="Secciones del panel" className="space-y-1">
      {allowed.map((n) => {
        const active = n.id === current.id;
        return (
          <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={active ? 'page' : undefined}
            className={`w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition ${active ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
            <n.icon className="w-5 h-5 shrink-0" /> {n.label}
          </button>
        );
      })}
    </nav>
  );

  const Account = () => (
    <div className="space-y-2">
      <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
        <p className="text-sm font-semibold text-white truncate">{store.mode === 'demo' ? ctx.profile.name : store.userName}</p>
        <p className="text-xs text-slate-400">{ROLE_LABEL[store.role]}</p>
      </div>
      {store.mode === 'demo' ? (
        <button type="button" onClick={() => { resetDemoData(); window.location.reload(); }} className="w-full h-10 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
          Reiniciar datos de la demo
        </button>
      ) : null}
      <button type="button" onClick={store.mode === 'demo' ? () => navigate('/') : onLogout} className="w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer">
        {store.mode === 'demo' ? <ExternalLink className="w-5 h-5" /> : <LogOut className="w-5 h-5" />} {store.mode === 'demo' ? 'Salir de la demo' : 'Cerrar sesión'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col gap-6 p-4 bg-[#0b1222] border-r border-slate-800">
        <button type="button" onClick={() => go('inicio')} className="px-2 pt-2 text-left cursor-pointer"><Logo className="h-8" light /></button>
        <div className="px-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Institución</p>
          <p className="text-sm font-bold text-white leading-snug mt-0.5">{ctx.config.shortName || ctx.config.institutionName}</p>
          <p className="text-xs text-slate-400 mt-0.5">Año {ctx.config.academicYear} · {ctx.config.activePeriod}</p>
        </div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        <Account />
      </aside>

      {/* Barra superior (celular y tablet) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-[#0b1222]/95 backdrop-blur border-b border-slate-800">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{ctx.config.shortName || ctx.config.institutionName}</p>
          <p className="text-[11px] text-slate-400 truncate">{current.label}</p>
        </div>
        <button type="button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)} className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-200 cursor-pointer">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-slate-950/70" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 inset-y-0 w-[86%] max-w-xs bg-[#0b1222] border-l border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <Logo className="h-7" light />
              <button type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            <NavList />
            <div className="mt-auto"><Account /></div>
          </div>
        </div>
      )}

      {store.mode === 'demo' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs sm:text-sm px-4 py-2 text-center">
          Modo demostración: los datos son de ejemplo y se guardan solo en este navegador.
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-10">
        {current.id === 'inicio' && <HomeTab ctx={ctx} />}
        {current.id === 'asistencia' && <AttendanceTab ctx={ctx} />}
        {current.id === 'estudiantes' && <StudentsTab ctx={ctx} />}
        {current.id === 'notas' && <GradesTab ctx={ctx} />}
        {current.id === 'docentes' && <TeachersTab ctx={ctx} />}
        {current.id === 'comunicados' && <AnnouncementsTab ctx={ctx} />}
        {current.id === 'configuracion' && <SettingsTab ctx={ctx} />}
      </main>

      {/* Navegación inferior (celular) */}
      <nav aria-label="Accesos rápidos" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0b1222]/95 backdrop-blur border-t border-slate-800 grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${bottom.length + 1}, minmax(0, 1fr))` }}>
        {bottom.map((n) => (
          <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={n.id === current.id ? 'page' : undefined}
            className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${n.id === current.id ? 'text-orange-400' : 'text-slate-400'}`}>
            <n.icon className="w-5 h-5" /> <span className="truncate max-w-full px-1">{n.label.split(' ')[0]}</span>
          </button>
        ))}
        <button type="button" onClick={() => setMenuOpen(true)} className="h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 cursor-pointer">
          <Menu className="w-5 h-5" /> Más
        </button>
      </nav>

      <div className="fixed z-[60] bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-start gap-2.5 border ${t.kind === 'ok' ? 'bg-emerald-950 border-emerald-700 text-emerald-100' : 'bg-rose-950 border-rose-700 text-rose-100'}`}>
            {t.kind === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <TriangleAlert className="w-5 h-5 shrink-0 text-rose-400" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

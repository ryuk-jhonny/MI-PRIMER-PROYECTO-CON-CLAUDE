import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Building2, KeyRound, Loader2, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase, friendlyError } from '../lib/supabase';
import { createCloudStore, DataStore, Role } from '../lib/store';
import { navigate } from '../lib/router';
import { DEFAULT_DIRECTOR_PROFILE, DEFAULT_INSTITUTION_CONFIG, EducationalLevel, InstitutionConfig, PRESET_INTEGRAL } from '../types/institution';
import Logo from './Logo';
import FullLoader from './FullLoader';

interface Membership {
  institution_id: string;
  role: Role;
  full_name: string;
  institutions: { name: string } | null;
}

export default function AuthGate({ children }: { children: (store: DataStore, onLogout: () => void) => ReactNode }) {
  const sb = supabase!;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [activeInst, setActiveInst] = useState<string | null>(() => {
    try { return localStorage.getItem('ryuk_active_institution'); } catch { return null; }
  });

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const loadMemberships = async () => {
    const { data, error } = await sb.from('members').select('institution_id, role, full_name, institutions(name)').eq('user_id', session!.user.id);
    if (error) { setMemberships([]); return; }
    setMemberships(data as unknown as Membership[]);
  };

  useEffect(() => {
    if (session) loadMemberships(); else setMemberships(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const current = useMemo(() => {
    if (!memberships?.length) return null;
    return memberships.find((m) => m.institution_id === activeInst) || memberships[0];
  }, [memberships, activeInst]);

  const store = useMemo(
    () => (current ? createCloudStore(current.institution_id, current.role, current.full_name || session?.user.email || '') : null),
    [current, session?.user.email],
  );

  const logout = async () => {
    await sb.auth.signOut();
    try { localStorage.removeItem('ryuk_active_institution'); } catch { /* nada */ }
    setActiveInst(null);
  };

  if (!ready || (session && memberships === null)) return <FullLoader />;
  if (recovery && session) return <NewPasswordScreen onDone={() => setRecovery(false)} />;
  if (!session) return <LoginScreen />;
  if (!current || !store) {
    return (
      <SetupScreen
        email={session.user.email || ''}
        onLogout={logout}
        onReady={async (id) => {
          try { localStorage.setItem('ryuk_active_institution', id); } catch { /* nada */ }
          setActiveInst(id);
          await loadMemberships();
        }}
      />
    );
  }
  return <>{children(store, logout)}</>;
}

// ---------------------------------------------------------------------

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <Logo className="h-8" light />
        </button>
        <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1.5 min-h-11 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver al sitio
        </button>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8`}>{children}</div>
      </main>
      <footer className="text-center text-xs text-slate-400 pb-6 px-4">
        Al usar Ryuk aceptas los{' '}
        <a href="/terminos" onClick={(e) => { e.preventDefault(); navigate('/terminos'); }} className="underline hover:text-white">Términos</a> y la{' '}
        <a href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }} className="underline hover:text-white">Política de privacidad</a>.
      </footer>
    </div>
  );
}

const inputCls = 'w-full h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 text-base';
const labelCls = 'block text-sm font-semibold text-slate-700 mb-1.5';
const primaryBtn = 'w-full h-12 rounded-xl bg-orange-700 hover:bg-orange-800 active:scale-[0.99] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition';

function Alert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`text-sm rounded-xl px-4 py-3 ${kind === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
      {children}
    </p>
  );
}

function LoginScreen() {
  const sb = supabase!;
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/app` } });
        if (error) throw error;
        if (!data.session) setInfo('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí para iniciar sesión.');
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/app` });
        if (error) throw error;
        setInfo('Si el correo existe, te llegará un enlace para crear una nueva contraseña.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Ingresa a tu colegio' : mode === 'signup' ? 'Crea tu cuenta' : 'Recupera tu contraseña'}
          </h1>
          <p className="text-sm text-slate-600">
            {mode === 'login' ? 'Dirección, docentes y personal de puerta.' : mode === 'signup' ? 'Luego registras tu colegio o te unes con el código que te dio la dirección.' : 'Te enviaremos un enlace a tu correo.'}
          </p>
        </div>

        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 text-sm font-semibold" role="tablist">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); setInfo(''); }}
                className={`h-11 rounded-lg cursor-pointer transition ${mode === m ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>Correo</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tucorreo@colegio.edu.pe" />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label htmlFor="password" className={labelCls}>Contraseña</label>
              <input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : undefined}
                value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : ''} />
            </div>
          )}
          {error && <Alert kind="error">{error}</Alert>}
          {info && <Alert kind="ok">{info}</Alert>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? <LogIn className="w-5 h-5" /> : mode === 'signup' ? <UserPlus className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            {mode === 'login' ? 'Ingresar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>

        <div className="text-sm text-center">
          {mode === 'forgot' ? (
            <button type="button" onClick={() => setMode('login')} className="text-orange-700 font-semibold hover:underline min-h-11 cursor-pointer">Volver a iniciar sesión</button>
          ) : (
            <button type="button" onClick={() => setMode('forgot')} className="text-slate-600 hover:text-slate-900 hover:underline min-h-11 cursor-pointer">¿Olvidaste tu contraseña?</button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 text-sm text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Las familias no necesitan cuenta: escanean el QR del carnet con su celular.</span>
        </div>
      </div>
    </Shell>
  );
}

function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendlyError(error)); else onDone();
  };
  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-2xl font-bold">Crea una nueva contraseña</h1>
        <div>
          <label htmlFor="np" className={labelCls}>Nueva contraseña</label>
          <input id="np" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <button type="submit" disabled={busy} className={primaryBtn}><KeyRound className="w-5 h-5" /> Guardar contraseña</button>
      </form>
    </Shell>
  );
}

const LEVELS: { id: EducationalLevel; label: string }[] = [
  { id: 'inicial', label: 'Inicial' },
  { id: 'primaria', label: 'Primaria' },
  { id: 'secundaria', label: 'Secundaria' },
];

function SetupScreen({ email, onReady, onLogout }: { email: string; onReady: (institutionId: string) => Promise<void>; onLogout: () => void }) {
  const sb = supabase!;
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [levels, setLevels] = useState<EducationalLevel[]>(['primaria', 'secundaria']);
  const [periodType, setPeriodType] = useState<'bimestral' | 'trimestral'>('bimestral');
  const [code, setCode] = useState('');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!levels.length) { setError('Elige al menos un nivel.'); return; }
    setBusy(true); setError('');
    const config: InstitutionConfig = {
      ...DEFAULT_INSTITUTION_CONFIG,
      institutionName: schoolName.trim(),
      shortName: shortName.trim() || schoolName.trim(),
      modularCodePrimaria: '', modularCodeSecundaria: '', modularCodeInicial: '', localCode: '',
      dre: '', ugel: '', directorName: fullName.trim(), directorDni: '', motto: '',
      academicYear: String(new Date().getFullYear()),
      activeLevels: levels,
      periodType,
      activePeriod: periodType === 'bimestral' ? 'Bimestre I' : 'Trimestre I',
      gradeConfigs: PRESET_INTEGRAL.gradeConfigs.map((g) => ({ ...g, enabled: levels.includes(g.level) })),
      timeZone: 'America/Lima',
    };
    const profile = { ...DEFAULT_DIRECTOR_PROFILE, name: fullName.trim(), email, dni: '', phone: '', specialty: '', signatureTitle: 'Director(a)', role: 'Director(a)' };
    const { data, error } = await sb.rpc('create_institution', { p_name: config.institutionName, p_config: config, p_profile: profile, p_full_name: fullName.trim() });
    if (error) { setBusy(false); setError(friendlyError(error)); return; }
    await onReady(data as string);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { data, error } = await sb.rpc('join_institution', { p_code: code, p_full_name: fullName.trim() });
    if (error) { setBusy(false); setError(friendlyError(error)); return; }
    await onReady(data as string);
  };

  return (
    <Shell wide={mode === 'create'}>
      {mode === 'choose' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">¡Bienvenido(a)!</h1>
            <p className="text-sm text-slate-600 mt-1">Ingresaste como <strong>{email}</strong>. ¿Qué quieres hacer?</p>
          </div>
          <button type="button" onClick={() => setMode('create')} className="w-full text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-600 transition flex gap-4 cursor-pointer">
            <Building2 className="w-7 h-7 text-orange-700 shrink-0" />
            <span><strong className="block">Registrar mi colegio</strong><span className="text-sm text-slate-600">Soy director(a) o promotor(a) y quiero empezar.</span></span>
          </button>
          <button type="button" onClick={() => setMode('join')} className="w-full text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-600 transition flex gap-4 cursor-pointer">
            <KeyRound className="w-7 h-7 text-orange-700 shrink-0" />
            <span><strong className="block">Unirme con un código</strong><span className="text-sm text-slate-600">Soy docente o personal de puerta y la dirección me dio un código.</span></span>
          </button>
          <button type="button" onClick={onLogout} className="w-full text-sm text-slate-500 hover:text-slate-800 min-h-11 cursor-pointer">Cerrar sesión</button>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={create} className="space-y-4">
          <h1 className="text-2xl font-bold">Registra tu colegio</h1>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="sn" className={labelCls}>Nombre oficial de la institución</label>
              <input id="sn" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={inputCls} placeholder="I.E. N.° 0000 Nombre del colegio" />
            </div>
            <div>
              <label htmlFor="sh" className={labelCls}>Nombre corto</label>
              <input id="sh" value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputCls} placeholder="Como lo conocen las familias" />
            </div>
            <div>
              <label htmlFor="fn" className={labelCls}>Tu nombre completo</label>
              <input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
            </div>
          </div>
          <fieldset>
            <legend className={labelCls}>Niveles que atiende</legend>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const on = levels.includes(l.id);
                return (
                  <button key={l.id} type="button" aria-pressed={on} onClick={() => setLevels(on ? levels.filter((x) => x !== l.id) : [...levels, l.id])}
                    className={`h-11 px-4 rounded-xl border-2 font-semibold text-sm cursor-pointer transition ${on ? 'border-orange-700 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600'}`}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Periodos de evaluación</legend>
            <div className="flex gap-2">
              {(['bimestral', 'trimestral'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={periodType === p} onClick={() => setPeriodType(p)}
                  className={`h-11 px-4 rounded-xl border-2 font-semibold text-sm cursor-pointer transition ${periodType === p ? 'border-orange-700 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600'}`}>
                  {p === 'bimestral' ? '4 bimestres' : '3 trimestres'}
                </button>
              ))}
            </div>
          </fieldset>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setMode('choose')} className="h-12 px-5 rounded-xl border border-slate-300 font-semibold text-slate-700 cursor-pointer">Atrás</button>
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Building2 className="w-5 h-5" />} Crear mi colegio</button>
          </div>
          <p className="text-xs text-slate-500">Luego podrás completar UGEL, códigos modulares, aulas y horarios en Configuración.</p>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={join} className="space-y-4">
          <h1 className="text-2xl font-bold">Únete a tu colegio</h1>
          <div>
            <label htmlFor="jn" className={labelCls}>Tu nombre completo</label>
            <input id="jn" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="jc" className={labelCls}>Código de invitación</label>
            <input id="jc" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${inputCls} font-mono tracking-widest uppercase`} placeholder="8 caracteres" maxLength={8} />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setMode('choose')} className="h-12 px-5 rounded-xl border border-slate-300 font-semibold text-slate-700 cursor-pointer">Atrás</button>
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Unirme</button>
          </div>
        </form>
      )}
    </Shell>
  );
}

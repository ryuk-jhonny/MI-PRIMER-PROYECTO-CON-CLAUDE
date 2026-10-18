import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Building2, CheckCircle2, GraduationCap, HeartHandshake, IdCard, KeyRound, Loader2, LogIn, Mail, QrCode, ShieldCheck, UserPlus } from 'lucide-react';
import {
  activateCarnet, CarnetWho, carnetActivationDone, checkCode, createInstitution, isPin, joinWithCode, loadProfile, login, loginWithCarnet, logout,
  resetPassword, signup, takeCarnetFailure, User, watchAuth,
} from '../lib/accounts';
import { fb, friendlyError } from '../lib/firebase';
import { ROLE_LABEL, tokenFromQr, UserProfile } from '../lib/store';
import { AREAS, Level, LEVEL_LABEL, LEVELS } from '../lib/cneb';
import { navigate } from '../lib/router';
import Logo from './Logo';
import { AppBackdrop } from '../panel/ui';
import FullLoader from './FullLoader';
import QrScanner from '../panel/QrScanner';

export default function AuthGate({ children }: { children: (me: UserProfile, onLogout: () => void) => ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => watchAuth(setUser), []);

  const refresh = useCallback(async (u: User) => {
    setError('');
    try {
      // Si se está activando un carnet, el perfil se crea justo después de la cuenta.
      await carnetActivationDone();
      if (fb().auth.currentUser?.uid !== u.uid) return;
      setProfile(await loadProfile(u.uid));
    } catch (err) { setError(friendlyError(err)); setProfile(null); }
  }, []);

  useEffect(() => {
    if (user) { setProfile(undefined); refresh(user); } else setProfile(null);
  }, [user, refresh]);

  const out = async () => { await logout(); setProfile(null); };

  if (user === undefined || (user && profile === undefined)) return <FullLoader />;
  if (!user) return <LoginScreen />;
  if (!profile) {
    return <SetupScreen email={user.email || ''} loadError={error} onLogout={out} onReady={(p) => setProfile(p)} />;
  }
  return <>{children(profile, out)}</>;
}

// ---------------------------------------------------------------------

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative isolate min-h-screen text-white flex flex-col">
      <AppBackdrop />
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between anim-rise">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <Logo className="h-8" light />
        </button>
        <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1.5 min-h-11 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver al sitio
        </button>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto flex items-start sm:items-center justify-center lg:justify-between gap-12 px-4 py-6 sm:py-10">
        {!wide && (
          <section className="hidden lg:block max-w-md stagger" aria-hidden="true">
            <p className="text-xs font-extrabold tracking-[0.2em] text-orange-400 uppercase">Aprender · Gestionar · Innovar</p>
            <h2 className="mt-4 font-serif-title text-5xl leading-[1.1] tracking-tight [text-wrap:balance]">
              Todo tu colegio, <span className="text-brand">en un solo lugar</span>
            </h2>
            <p className="mt-5 text-slate-300 leading-relaxed">
              Asistencia con carnet QR, notas por competencia del CNEB, planificación y comunicados para toda la comunidad educativa.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                { icon: Building2, t: 'Dirección' },
                { icon: GraduationCap, t: 'Docentes' },
                { icon: ShieldCheck, t: 'Estudiantes' },
                { icon: HeartHandshake, t: 'Familias' },
              ].map(({ icon: I, t }) => (
                <div key={t} className="lift flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-400/40">
                  <span className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-300 flex items-center justify-center"><I className="w-5 h-5" /></span>
                  <span className="text-sm font-semibold">{t}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className={`w-full ${wide ? 'max-w-2xl mx-auto' : 'max-w-md'} bg-white text-slate-900 rounded-3xl shadow-2xl shadow-orange-950/40 ring-1 ring-white/10 p-6 sm:p-8 anim-pop`}>{children}</div>
      </main>
      <footer className="text-center text-xs text-slate-400 pb-6 px-4 anim-fade">
        Al usar Ryuk aceptas los{' '}
        <a href="/terminos" onClick={(e) => { e.preventDefault(); navigate('/terminos'); }} className="underline hover:text-white">Términos</a> y la{' '}
        <a href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }} className="underline hover:text-white">Política de privacidad</a>.
      </footer>
    </div>
  );
}

const inputCls = 'w-full h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 text-base';
const labelCls = 'block text-sm font-semibold text-slate-700 mb-1.5';
const primaryBtn = 'btn-glow w-full h-12 rounded-xl active:scale-[0.99] text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition';
const chip = (on: boolean) => `h-11 px-4 rounded-xl border-2 font-semibold text-sm cursor-pointer transition ${on ? 'border-orange-700 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`;

function Alert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`text-sm rounded-xl px-4 py-3 ${kind === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
      {children}
    </p>
  );
}

const carnetFromHash = () => window.location.hash.match(/^#carnet=([a-f0-9]{16,64})$/i)?.[1].toLowerCase() || null;

function LoginScreen() {
  const [failure] = useState(takeCarnetFailure);
  // undefined: ingreso con correo · null: carnet sin escanear · texto: token del carnet
  const [carnet, setCarnet] = useState<string | null | undefined>(() => failure?.token || carnetFromHash() || undefined);
  if (carnet !== undefined) {
    return <CarnetScreen token={carnet} initialWho={failure?.who} initialError={failure?.error} onToken={setCarnet} onBack={() => { setCarnet(undefined); if (carnetFromHash()) window.history.replaceState({}, '', '/app'); }} />;
  }
  return <EmailLogin onCarnet={() => setCarnet(null)} />;
}

function EmailLogin({ onCarnet }: { onCarnet: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(() => (window.location.hash === '#crear' ? 'signup' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else if (mode === 'signup') await signup(email, password);
      else { await resetPassword(email); setInfo('Si el correo tiene una cuenta, te llegará un enlace para crear una nueva contraseña.'); }
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
            {mode === 'login' ? 'Dirección, docentes, estudiantes y familias.' : mode === 'signup' ? 'Después registras tu colegio o te unes con el código que te dio la dirección.' : 'Te enviaremos un enlace a tu correo.'}
          </p>
        </div>

        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 text-sm font-semibold" role="tablist">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); setInfo(''); }}
                className={`relative h-11 rounded-lg cursor-pointer transition-colors ${mode === m ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {mode === m && <motion.span layoutId="auth-tab" transition={{ type: 'spring', stiffness: 450, damping: 35 }} className="absolute inset-0 rounded-lg bg-white shadow" />}
                <span className="relative">{m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>Correo</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tucorreo@ejemplo.com" />
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

        {mode === 'login' && (
          <button type="button" onClick={onCarnet}
            className="lift group w-full p-4 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-600 bg-orange-50/60 flex items-center gap-3 text-left cursor-pointer">
            <span className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"><QrCode className="w-6 h-6" /></span>
            <span><strong className="block text-slate-900">Entrar con mi carnet QR</strong><span className="text-sm text-slate-600">Estudiantes y familias: escanea el QR y escribe tu PIN.</span></span>
          </button>
        )}

        <div className="pt-4 border-t border-slate-200 text-sm text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Las familias también pueden ver el avance sin cuenta: basta con escanear el QR del carnet.</span>
        </div>
      </div>
    </Shell>
  );
}

function CarnetScreen({ token, initialWho, initialError, onToken, onBack }: {
  token: string | null; initialWho?: CarnetWho; initialError?: string; onToken: (t: string | null) => void; onBack: () => void;
}) {
  const [who, setWho] = useState<CarnetWho>(initialWho || 'estudiante');
  const [mode, setMode] = useState<'pin' | 'activate'>(initialError ? 'activate' : 'pin');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');

  const onScan = (raw: string) => {
    const t = tokenFromQr(raw);
    if (t) { setError(''); onToken(t); } else setError('Ese QR no es un carnet de Ryuk.');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    if (mode === 'activate' && pin !== pin2) { setError('Los dos PIN no coinciden.'); return; }
    if (!isPin(pin)) { setError('El PIN tiene que tener 6 números.'); return; }
    setBusy(true);
    try {
      if (mode === 'pin') await loginWithCarnet(token, who, pin);
      else await activateCarnet(token, who, { code, fullName, pin });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const pinInput = (id: string, value: string, set: (v: string) => void, labelText: string, auto: string) => (
    <div>
      <label htmlFor={id} className={labelCls}>{labelText}</label>
      <input id={id} type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete={auto} required value={value}
        onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className={`${inputCls} text-center tracking-[0.6em] font-mono text-xl`} placeholder="••••••" />
    </div>
  );

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{!token ? 'Escanea tu carnet' : mode === 'pin' ? 'Ingresa con tu carnet' : 'Activa tu carnet'}</h1>
          <p className="text-sm text-slate-600">
            {!token ? 'Apunta la cámara al código QR de tu carnet escolar.'
              : mode === 'pin' ? 'Escribe tu PIN de 6 números.'
                : 'Solo la primera vez: usa el código de acceso que te dio el colegio y elige tu PIN.'}
          </p>
        </div>

        {!token ? (
          <QrScanner onCode={onScan} submitLabel="Usar" />
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 anim-pop">
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><IdCard className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1 text-sm"><strong className="block text-emerald-900">Carnet detectado</strong><span className="text-emerald-800">Código terminado en {token.slice(-6).toUpperCase()}</span></span>
              <button type="button" onClick={() => { onToken(null); setError(''); }} className="text-sm font-semibold text-emerald-800 hover:underline min-h-11 px-1 cursor-pointer">Cambiar</button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 text-sm font-semibold" role="radiogroup" aria-label="¿Quién ingresa?">
              {(['estudiante', 'familia'] as const).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={who === w} onClick={() => { setWho(w); setError(''); }}
                  className={`relative h-11 rounded-lg cursor-pointer transition-colors ${who === w ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                  {who === w && <motion.span layoutId="carnet-who" transition={{ type: 'spring', stiffness: 450, damping: 35 }} className="absolute inset-0 rounded-lg bg-white shadow" />}
                  <span className="relative inline-flex items-center gap-1.5">{w === 'estudiante' ? <GraduationCap className="w-4 h-4" /> : <HeartHandshake className="w-4 h-4" />}{w === 'estudiante' ? 'Soy el estudiante' : 'Soy la familia'}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'activate' && (
                <>
                  <div>
                    <label htmlFor="cc" className={labelCls}>{who === 'estudiante' ? 'Código de estudiante' : 'Código de familia'}</label>
                    <input id="cc" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${inputCls} font-mono tracking-widest uppercase`} autoComplete="off" placeholder="Lo entrega la dirección" />
                  </div>
                  <div>
                    <label htmlFor="cn" className={labelCls}>{who === 'estudiante' ? 'Tu nombre completo' : 'Nombre del padre, madre o apoderado(a)'}</label>
                    <input id="cn" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
                  </div>
                </>
              )}
              {pinInput('pin', pin, setPin, mode === 'pin' ? 'PIN' : 'Elige un PIN de 6 números', mode === 'pin' ? 'current-password' : 'new-password')}
              {mode === 'activate' && pinInput('pin2', pin2, setPin2, 'Repite el PIN', 'new-password')}
              {error && <Alert kind="error">{error}</Alert>}
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'pin' ? <LogIn className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
                {mode === 'pin' ? 'Ingresar' : 'Activar e ingresar'}
              </button>
            </form>

            <p className="text-sm text-center text-slate-600">
              {mode === 'pin' ? (
                <>¿Primera vez? <button type="button" onClick={() => { setMode('activate'); setError(''); }} className="text-orange-700 font-semibold hover:underline min-h-11 cursor-pointer">Activar mi carnet</button></>
              ) : (
                <>¿Ya lo activaste? <button type="button" onClick={() => { setMode('pin'); setError(''); }} className="text-orange-700 font-semibold hover:underline min-h-11 cursor-pointer">Ingresar con mi PIN</button></>
              )}
            </p>
          </>
        )}

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <p className="text-xs text-slate-500 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>¿Olvidaste tu PIN o perdiste el carnet? Pide a la dirección un QR nuevo: el anterior deja de funcionar y vuelves a activar el nuevo.</span></p>
          <button type="button" onClick={onBack} className="w-full text-sm text-slate-600 hover:text-slate-900 min-h-11 inline-flex items-center justify-center gap-1.5 cursor-pointer"><Mail className="w-4 h-4" /> Ingresar con correo</button>
        </div>
      </div>
    </Shell>
  );
}

function SetupScreen({ email, loadError, onReady, onLogout }: { email: string; loadError: string; onReady: (p: UserProfile) => void; onLogout: () => void }) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(loadError);
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [levels, setLevels] = useState<Level[]>(['primaria', 'secundaria']);
  const [periodType, setPeriodType] = useState<'bimestral' | 'trimestral'>('bimestral');
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState<Awaited<ReturnType<typeof checkCode>> | null>(null);
  const [areas, setAreas] = useState<string[]>([]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(friendlyError(err)); }
    setBusy(false);
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!levels.length) { setError('Elige al menos un nivel.'); return; }
    run(async () => onReady(await createInstitution({ fullName, schoolName, shortName, levels, periodType })));
  };

  const verify = (e: FormEvent) => { e.preventDefault(); run(async () => setChecked(await checkCode(code))); };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (checked?.role === 'docente' && (!areas.length || !levels.length)) { setError('Elige al menos un área y un nivel.'); return; }
    run(async () => onReady(await joinWithCode(code, { fullName, areas, levels })));
  };

  const areaOptions = AREAS.filter((a) => levels.some((l) => a.competencias[l]?.length));

  return (
    <Shell wide={mode !== 'choose'}>
      {mode === 'choose' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">¡Bienvenido(a)!</h1>
            <p className="text-sm text-slate-600 mt-1">Ingresaste como <strong>{email}</strong>. ¿Qué quieres hacer?</p>
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <button type="button" onClick={() => setMode('create')} className="lift group w-full text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-600 hover:shadow-lg hover:shadow-orange-600/10 flex gap-4 cursor-pointer">
            <Building2 className="w-7 h-7 text-orange-700 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            <span><strong className="block">Registrar mi colegio</strong><span className="text-sm text-slate-600">Soy director(a) o promotor(a) y quiero empezar.</span></span>
          </button>
          <button type="button" onClick={() => setMode('join')} className="lift group w-full text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-600 hover:shadow-lg hover:shadow-orange-600/10 flex gap-4 cursor-pointer">
            <KeyRound className="w-7 h-7 text-orange-700 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            <span><strong className="block">Unirme con un código</strong><span className="text-sm text-slate-600">Soy docente, personal de puerta, estudiante o familia y el colegio me dio un código.</span></span>
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
              <input id="fn" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
            </div>
          </div>
          <fieldset>
            <legend className={labelCls}>Niveles que atiende</legend>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const on = levels.includes(l);
                return <button key={l} type="button" aria-pressed={on} onClick={() => setLevels(on ? levels.filter((x) => x !== l) : [...levels, l])} className={chip(on)}>{LEVEL_LABEL[l]}</button>;
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Periodos de evaluación</legend>
            <div className="flex gap-2">
              {(['bimestral', 'trimestral'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={periodType === p} onClick={() => setPeriodType(p)} className={chip(periodType === p)}>
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
          <p className="text-xs text-slate-500">Luego completas UGEL, códigos modulares, aulas y horarios en Configuración.</p>
        </form>
      )}

      {mode === 'join' && !checked && (
        <form onSubmit={verify} className="space-y-4">
          <h1 className="text-2xl font-bold">Únete a tu colegio</h1>
          <p className="text-sm text-slate-600">La dirección entrega un código a cada docente y al personal de puerta. Estudiantes y familias encuentran el suyo en la ficha que entrega el colegio.</p>
          <div>
            <label htmlFor="jc" className={labelCls}>Código</label>
            <input id="jc" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${inputCls} font-mono tracking-widest uppercase`} placeholder="Ej.: K7MQ2PXA" maxLength={14} autoComplete="off" />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setMode('choose')} className="h-12 px-5 rounded-xl border border-slate-300 font-semibold text-slate-700 cursor-pointer">Atrás</button>
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Validar código</button>
          </div>
        </form>
      )}

      {mode === 'join' && checked && (
        <form onSubmit={join} className="space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
            <div className="text-sm text-emerald-900">
              <p className="font-bold">Código válido</p>
              <p>Te unirás como <strong>{ROLE_LABEL[checked.role]}</strong>.</p>
            </div>
          </div>
          <div>
            <label htmlFor="jn" className={labelCls}>{checked.role === 'familia' ? 'Nombre del padre, madre o apoderado(a)' : 'Tu nombre completo'}</label>
            <input id="jn" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
          </div>

          {checked.role === 'docente' && (
            <>
              <fieldset>
                <legend className={labelCls}>¿En qué nivel enseñas?</legend>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => {
                    const on = levels.includes(l);
                    return <button key={l} type="button" aria-pressed={on} onClick={() => setLevels(on ? levels.filter((x) => x !== l) : [...levels, l])} className={chip(on)}>{LEVEL_LABEL[l]}</button>;
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className={labelCls}>¿Qué áreas del CNEB enseñas?</legend>
                {levels.includes('primaria') && (
                  <button type="button" onClick={() => setAreas([...new Set([...areas, ...AREAS.filter((a) => a.competencias.primaria).map((a) => a.name)])])}
                    className="mb-3 text-sm font-semibold text-orange-700 hover:underline cursor-pointer inline-flex items-center gap-1.5 min-h-11">
                    <GraduationCap className="w-4 h-4" /> Soy docente de aula de primaria (todas las áreas)
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  {areaOptions.map((a) => {
                    const on = areas.includes(a.name);
                    return <button key={a.name} type="button" aria-pressed={on} onClick={() => setAreas(on ? areas.filter((x) => x !== a.name) : [...areas, a.name])} className={chip(on)}>{a.name}</button>;
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">Tu panel se arma con las competencias, capacidades y herramientas de tus áreas. Puedes cambiarlo después.</p>
              </fieldset>
            </>
          )}

          {(checked.role === 'estudiante' || checked.role === 'familia') && (
            <p className="text-sm text-slate-600 flex items-start gap-2"><HeartHandshake className="w-5 h-5 text-orange-700 shrink-0" /> Verás las notas por competencia, la asistencia, las actividades y los comunicados del colegio.</p>
          )}

          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => { setChecked(null); setError(''); }} className="h-12 px-5 rounded-xl border border-slate-300 font-semibold text-slate-700 cursor-pointer">Atrás</button>
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Unirme</button>
          </div>
        </form>
      )}
    </Shell>
  );
}

import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail,
  signInAnonymously, signInWithEmailAndPassword, signOut, User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { DEFAULT_DIRECTOR_PROFILE, DEFAULT_INSTITUTION_CONFIG, InstitutionConfig } from '../types/institution';
import type { Level } from './cneb';
import { fb, friendlyError } from './firebase';
import { normalizeCode, randomCode, randomToken, Role, UserProfile } from './store';

export type { User };

export function watchAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(fb().auth, cb);
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(fb().auth, email.trim(), password);
}

export async function signup(email: string, password: string) {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const cred = await createUserWithEmailAndPassword(fb().auth, email.trim(), password);
  sendEmailVerification(cred.user).catch(() => { /* el correo de verificación es opcional */ });
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(fb().auth, email.trim());
}

export async function logout() {
  await signOut(fb().auth);
}

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(fb().db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

function currentUser(): User {
  const u = fb().auth.currentUser;
  if (!u) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión.');
  return u;
}

/** Dirección: crea el colegio, sus códigos de invitación y la cuenta de director(a). */
export async function createInstitution(input: {
  fullName: string; schoolName: string; shortName: string; levels: Level[]; periodType: InstitutionConfig['periodType'];
}): Promise<UserProfile> {
  const { db } = fb();
  const u = currentUser();
  const iid = `in_${randomToken()}`;
  const codes = { docente: randomCode(8), auxiliar: randomCode(8) };
  const config: InstitutionConfig = {
    ...DEFAULT_INSTITUTION_CONFIG,
    institutionName: input.schoolName.trim(),
    shortName: input.shortName.trim() || input.schoolName.trim(),
    directorName: input.fullName.trim(),
    activeLevels: input.levels,
    periodType: input.periodType,
    activePeriod: input.periodType === 'bimestral' ? 'Bimestre I' : 'Trimestre I',
    gradeConfigs: DEFAULT_INSTITUTION_CONFIG.gradeConfigs.map((g) => ({ ...g, enabled: input.levels.includes(g.level) })),
  };
  const profile: UserProfile = {
    uid: u.uid, email: u.email || '', fullName: input.fullName.trim(), role: 'director', institutionId: iid, createdAt: new Date().toISOString(),
  };
  const b = writeBatch(db);
  b.set(doc(db, 'institutions', iid), {
    name: config.institutionName, config, ownerUid: u.uid, createdAt: profile.createdAt,
    profile: { ...DEFAULT_DIRECTOR_PROFILE, name: profile.fullName, email: profile.email },
  });
  b.set(doc(db, 'users', u.uid), profile);
  b.set(doc(db, 'institutions', iid, 'private', 'codes'), codes);
  b.set(doc(db, 'joinCodes', codes.docente), { institutionId: iid, role: 'docente' });
  b.set(doc(db, 'joinCodes', codes.auxiliar), { institutionId: iid, role: 'auxiliar' });
  b.set(doc(db, 'boards', iid), { institutionId: iid, announcements: [] });
  await b.commit();
  return profile;
}

export interface JoinInfo { institutionId: string; role: Role; studentId?: string }

/** Revisa un código de invitación (docente / personal) o de vinculación (estudiante / familia). */
export async function checkCode(raw: string): Promise<JoinInfo & { code: string; kind: 'join' | 'link' }> {
  const { db } = fb();
  const code = normalizeCode(raw);
  if (code.length < 8) throw new Error('El código está incompleto.');
  const join = await getDoc(doc(db, 'joinCodes', code));
  if (join.exists()) {
    const d = join.data() as { institutionId: string; role: Role };
    return { code, kind: 'join', institutionId: d.institutionId, role: d.role };
  }
  const link = await getDoc(doc(db, 'linkCodes', code));
  if (link.exists()) {
    const d = link.data() as { institutionId: string; studentId: string; kind: Role };
    return { code, kind: 'link', institutionId: d.institutionId, role: d.kind, studentId: d.studentId };
  }
  throw new Error('El código no es válido. Pídelo de nuevo a la dirección del colegio.');
}

export const CARNET_ONLY = 'Ese es un código de estudiante o de familia. Estudiantes y familias no usan correo: entran con su carnet QR y su PIN.';

/** Crea la cuenta dentro del colegio con el código recibido. Estudiantes y familias solo con su carnet. */
export async function joinWithCode(raw: string, input: { fullName: string; areas?: string[]; levels?: Level[] }): Promise<UserProfile> {
  const { db } = fb();
  const u = currentUser();
  const info = await checkCode(raw);
  if (info.kind === 'link') throw new Error(CARNET_ONLY);
  const profile: UserProfile = {
    uid: u.uid, email: u.email || '', fullName: input.fullName.trim(), role: info.role, institutionId: info.institutionId,
    createdAt: new Date().toISOString(),
  };
  if (info.role === 'docente') { profile.areas = input.areas || []; profile.levels = input.levels || []; profile.aulas = []; }
  const data: Record<string, unknown> = { ...profile, [info.kind === 'join' ? 'joinCode' : 'linkCode']: info.code };
  const b = writeBatch(db);
  b.set(doc(db, 'users', u.uid), data);
  await b.commit();
  return profile;
}

// ---------------------------------------------------------------------
// Ingreso con el carnet QR y un PIN de 6 dígitos, con el proveedor Anónimo de Firebase:
// en Authentication no queda ningún correo ni nombre. Al activar el carnet se guardan
//   carnets/{token}_{rol}     colegio y estudiante (se lee conociendo el token)
//   carnetPins/{token}_{rol}  el hash del PIN (nadie lo lee; solo lo usan las reglas)
// Cada ingreso es una sesión anónima nueva cuyo perfil solo se crea si el PIN coincide.
// Las reglas solo dejan ver la ficha mientras el token siga siendo el del carnet vigente:
// si la dirección genera un QR nuevo, el carnet anterior y su PIN dejan de servir.
// Al cerrar sesión se borran el perfil y el usuario anónimo, para no acumularlos.

export type CarnetWho = 'estudiante' | 'familia';

export const isPin = (pin: string) => /^\d{6}$/.test(pin);

const carnetId = (token: string, who: CarnetWho) => `${token}_${who}`;

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** Prueba del PIN que viaja en el perfil; las reglas comparan su hash con el guardado al activar. */
const pinProof = (token: string, who: CarnetWho, pin: string) => sha256Hex(`ryuk|${token}|${who}|${pin}`);

function errCode(err: unknown) {
  return (err as { code?: string })?.code || '';
}

let pending: Promise<unknown> | null = null;

/** Mientras se entra con un carnet, la sesión anónima ya existe pero el perfil aún no: AuthGate espera esto. */
export function carnetActivationDone(): Promise<unknown> {
  return (pending || Promise.resolve()).catch(() => undefined);
}

type CarnetMode = 'pin' | 'activate';
let lastFailure: { token: string; who: CarnetWho; mode: CarnetMode; error: string } | null = null;
/** El último intento fallido: la pantalla de ingreso se vuelve a montar al cerrarse la sesión y lo retoma. */
export function peekCarnetFailure() {
  return lastFailure;
}
export function clearCarnetFailure() {
  lastFailure = null;
}

/** Abre una sesión anónima, ejecuta `fn` y, si falla, borra ese usuario anónimo. */
async function withAnonymousSession(token: string, who: CarnetWho, mode: CarnetMode, fn: (u: User) => Promise<void>) {
  const run = (async () => {
    const u = (await signInAnonymously(fb().auth)).user;
    try {
      await fn(u);
    } catch (err) {
      // El error queda guardado antes, porque al cerrarse la sesión la pantalla se vuelve a montar.
      lastFailure = { token, who, mode, error: err instanceof Error && !errCode(err) ? err.message : friendlyError(err) };
      await u.delete().catch(() => signOut(fb().auth));
      throw err;
    }
  })();
  pending = run;
  try { await run; } finally { if (pending === run) pending = null; }
}

async function createCarnetProfile(u: User, token: string, who: CarnetWho, pin: string) {
  const { db } = fb();
  const carnet = await getDoc(doc(db, 'carnets', carnetId(token, who)));
  if (!carnet.exists()) throw new Error('Este carnet todavía no está activado. Pulsa «Activar mi carnet».');
  const c = carnet.data() as { institutionId: string; studentId: string };
  const profile: UserProfile & { pinProof: string } = {
    uid: u.uid, email: '', fullName: who === 'estudiante' ? 'Estudiante' : 'Familia', role: who,
    institutionId: c.institutionId, studentIds: [c.studentId], carnetToken: token,
    createdAt: new Date().toISOString(), pinProof: await pinProof(token, who, pin),
  };
  try {
    await setDoc(doc(db, 'users', u.uid), profile);
  } catch (err) {
    if (errCode(err) === 'permission-denied') {
      throw new Error('El PIN no es correcto, o este carnet ya no está vigente. Si lo olvidaste, pide a la dirección un QR nuevo.');
    }
    throw err;
  }
}

export async function loginWithCarnet(token: string, who: CarnetWho, pin: string) {
  if (!isPin(pin)) throw new Error('El PIN tiene 6 números.');
  await withAnonymousSession(token, who, 'pin', (u) => createCarnetProfile(u, token, who, pin));
}

/** Primera vez: registra el carnet con el código de acceso de la ficha y el PIN elegido, y entra. */
export async function activateCarnet(token: string, who: CarnetWho, input: { code: string; pin: string }) {
  if (!isPin(input.pin)) throw new Error('El PIN tiene que tener 6 números.');
  await withAnonymousSession(token, who, 'activate', async (u) => {
    const { db } = fb();
    const id = carnetId(token, who);
    if ((await getDoc(doc(db, 'carnets', id))).exists()) {
      throw new Error('Este carnet ya está activado. Ingresa con tu PIN. Si lo olvidaste, pide a la dirección un QR nuevo.');
    }
    const info = await checkCode(input.code);
    if (info.kind !== 'link' || info.role !== who) {
      throw new Error(who === 'estudiante' ? 'Usa el código de estudiante que te dio el colegio.' : 'Usa el código de familia que te dio el colegio.');
    }
    const b = writeBatch(db);
    b.set(doc(db, 'carnets', id), { institutionId: info.institutionId, studentId: info.studentId, role: who, createdAt: new Date().toISOString() });
    b.set(doc(db, 'carnetPins', id), { pinHash: await sha256Hex(await pinProof(token, who, input.pin)), linkCode: info.code });
    try {
      await b.commit();
    } catch (err) {
      if (errCode(err) === 'permission-denied') throw new Error('Ese código no corresponde a este carnet.');
      throw err;
    }
    await createCarnetProfile(u, token, who, input.pin);
  });
}

/** Cerrar sesión. Las sesiones de carnet se borran del todo (perfil y usuario anónimo). */
export async function logoutAndForget() {
  const u = fb().auth.currentUser;
  if (u?.isAnonymous) {
    await deleteDoc(doc(fb().db, 'users', u.uid)).catch(() => undefined);
    await u.delete().catch(() => undefined);
  }
  await signOut(fb().auth);
}

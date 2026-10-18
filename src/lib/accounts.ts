import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, User,
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
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

/** Crea la cuenta dentro del colegio con el código recibido. */
export async function joinWithCode(raw: string, input: { fullName: string; areas?: string[]; levels?: Level[]; carnetToken?: string }): Promise<UserProfile> {
  const { db } = fb();
  const u = currentUser();
  const info = await checkCode(raw);
  const profile: UserProfile = {
    uid: u.uid, email: u.email || '', fullName: input.fullName.trim(), role: info.role, institutionId: info.institutionId,
    createdAt: new Date().toISOString(),
  };
  if (info.role === 'docente') { profile.areas = input.areas || []; profile.levels = input.levels || []; profile.aulas = []; }
  if (info.studentId) profile.studentIds = [info.studentId];
  if (input.carnetToken) profile.carnetToken = input.carnetToken;
  const data: Record<string, unknown> = { ...profile, [info.kind === 'join' ? 'joinCode' : 'linkCode']: info.code };
  const b = writeBatch(db);
  b.set(doc(db, 'users', u.uid), data);
  await b.commit();
  return profile;
}

/** Familia: vincula a otro hijo o hija del mismo colegio. */
export async function linkAnotherChild(me: UserProfile, raw: string): Promise<string> {
  const info = await checkCode(raw);
  if (info.kind !== 'link' || info.role !== 'familia') throw new Error('Usa el código de familia que figura en la ficha del estudiante.');
  if (info.institutionId !== me.institutionId) throw new Error('Ese estudiante es de otro colegio. Por ahora una cuenta pertenece a un solo colegio.');
  if (me.studentIds?.includes(info.studentId!)) throw new Error('Ese estudiante ya está vinculado a tu cuenta.');
  await updateDoc(doc(fb().db, 'users', me.uid), { studentIds: arrayUnion(info.studentId), linkCode: info.code });
  return info.studentId!;
}

// ---------------------------------------------------------------------
// Ingreso con el carnet QR y un PIN de 6 dígitos.
// Cada carnet tiene dos cuentas posibles (estudiante y familia) con un correo interno
// derivado del token del QR; el PIN es su contraseña. Las reglas de Firestore solo
// dejan leer los datos mientras el token siga siendo el del carnet vigente: si la
// dirección genera un QR nuevo, esas cuentas dejan de ver la ficha.

export type CarnetWho = 'estudiante' | 'familia';

const CARNET_DOMAIN = 'carnet.example.com';
const carnetEmail = (token: string, who: CarnetWho) => `${who === 'estudiante' ? 'e' : 'f'}-${token}@${CARNET_DOMAIN}`;
const carnetPassword = (pin: string) => `ryuk-carnet-${pin}`;

export const isPin = (pin: string) => /^\d{6}$/.test(pin);

function errCode(err: unknown) {
  return (err as { code?: string })?.code || '';
}

export async function loginWithCarnet(token: string, who: CarnetWho, pin: string) {
  if (!isPin(pin)) throw new Error('El PIN tiene 6 números.');
  try {
    await signInWithEmailAndPassword(fb().auth, carnetEmail(token, who), carnetPassword(pin));
  } catch (err) {
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(errCode(err))) {
      throw new Error('El PIN no es correcto, o este carnet todavía no está activado. Si es la primera vez, pulsa «Activar mi carnet».');
    }
    throw err;
  }
}

let activation: Promise<unknown> | null = null;

/** Mientras se activa un carnet, la sesión ya existe pero el perfil aún no: AuthGate espera esto antes de cargarlo. */
export function carnetActivationDone(): Promise<unknown> {
  return (activation || Promise.resolve()).catch(() => undefined);
}

let lastFailure: { token: string; who: CarnetWho; error: string } | null = null;
/** La última activación fallida: la pantalla de ingreso se vuelve a montar al cerrarse la sesión y la retoma. */
export function takeCarnetFailure() {
  const f = lastFailure;
  lastFailure = null;
  return f;
}

/** Primera vez: crea la cuenta del carnet con el código de acceso de la ficha y el PIN elegido. */
export async function activateCarnet(token: string, who: CarnetWho, input: { code: string; fullName: string; pin: string }) {
  if (!isPin(input.pin)) throw new Error('El PIN tiene que tener 6 números.');
  if (input.fullName.trim().length < 2) throw new Error('Escribe tu nombre.');
  const run = (async () => {
    let created: User;
    try {
      created = (await createUserWithEmailAndPassword(fb().auth, carnetEmail(token, who), carnetPassword(input.pin))).user;
    } catch (err) {
      if (errCode(err) === 'auth/email-already-in-use') {
        throw new Error('Este carnet ya está activado. Ingresa con tu PIN. Si lo olvidaste, pide a la dirección un QR nuevo.');
      }
      throw err;
    }
    try {
      const info = await checkCode(input.code);
      if (info.kind !== 'link' || info.role !== who) {
        throw new Error(who === 'estudiante' ? 'Usa el código de estudiante que te dio el colegio.' : 'Usa el código de familia que te dio el colegio.');
      }
      try {
        await joinWithCode(input.code, { fullName: input.fullName, carnetToken: token });
      } catch (err) {
        if (errCode(err) === 'permission-denied') throw new Error('Ese código no corresponde a este carnet.');
        throw err;
      }
    } catch (err) {
      // Sin perfil la cuenta no sirve: la borramos para poder activar el carnet otra vez.
      // El error queda guardado antes, porque al cerrarse la sesión la pantalla se vuelve a montar.
      lastFailure = { token, who, error: friendlyError(err) };
      await created.delete().catch(() => signOut(fb().auth));
      throw err;
    }
  })();
  activation = run;
  try {
    await run;
  } finally {
    if (activation === run) activation = null;
  }
}

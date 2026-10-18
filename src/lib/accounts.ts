import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, User,
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { DEFAULT_DIRECTOR_PROFILE, DEFAULT_INSTITUTION_CONFIG, InstitutionConfig } from '../types/institution';
import type { Level } from './cneb';
import { fb } from './firebase';
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
export async function joinWithCode(raw: string, input: { fullName: string; areas?: string[]; levels?: Level[] }): Promise<UserProfile> {
  const { db } = fb();
  const u = currentUser();
  const info = await checkCode(raw);
  const profile: UserProfile = {
    uid: u.uid, email: u.email || '', fullName: input.fullName.trim(), role: info.role, institutionId: info.institutionId,
    createdAt: new Date().toISOString(),
  };
  if (info.role === 'docente') { profile.areas = input.areas || []; profile.levels = input.levels || []; profile.aulas = []; }
  if (info.studentId) profile.studentIds = [info.studentId];
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

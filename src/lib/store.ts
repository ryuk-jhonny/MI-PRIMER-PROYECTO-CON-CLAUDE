import {
  collection, deleteDoc, doc, Firestore, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, runTransaction,
  setDoc, updateDoc, where, writeBatch, WriteBatch,
} from 'firebase/firestore';
import { Student } from '../types/education';
import { DEFAULT_DIRECTOR_PROFILE, DEFAULT_INSTITUTION_CONFIG, DirectorProfile, InstitutionConfig } from '../types/institution';
import type { Level } from './cneb';
import { fb } from './firebase';

// =====================================================================
// Tipos compartidos
// =====================================================================

export type StaffRole = 'director' | 'docente' | 'auxiliar';
export type Role = StaffRole | 'estudiante' | 'familia';
export type AttendanceStatus = 'Puntual' | 'Tardanza' | 'Justificada' | 'Inasistencia';

export const ROLE_LABEL: Record<Role, string> = {
  director: 'Dirección',
  docente: 'Docente',
  auxiliar: 'Personal de puerta',
  estudiante: 'Estudiante',
  familia: 'Familia',
};

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  institutionId: string;
  /** Docentes: áreas CNEB que enseña. */
  areas?: string[];
  /** Docentes: niveles donde enseña. */
  levels?: Level[];
  /** Docentes: aulas a su cargo ("3ro Primaria · A"). Vacío = todas. */
  aulas?: string[];
  /** Estudiante (uno) o familia (uno o más hijos). */
  studentIds?: string[];
  /** Cuentas que entran con el carnet QR y un PIN: el token del carnet con el que se activaron. */
  carnetToken?: string;
  phone?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  day: string; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  status: AttendanceStatus;
  recordedBy: string;
}

export interface Announcement {
  id: string;
  audience: 'all' | 'primaria' | 'secundaria';
  body: string;
  authorName: string;
  authorUid: string;
  createdAt: string;
}

export interface ScanResult {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  student?: Student;
  status?: AttendanceStatus;
  time?: string;
}

export type PlanStatus = 'Borrador' | 'Enviado' | 'Observado' | 'Visado';

export interface Plan {
  id: string;
  kind: 'unidad' | 'sesion';
  ownerUid: string;
  ownerName: string;
  area: string;
  level: Level;
  grade: string;
  section: string;
  title: string;
  period: string;
  date: string;
  duration: string;
  situacion: string;
  proposito: string;
  competencias: string[];
  capacidades: string[];
  desempenos: string;
  criterios: string;
  evidencia: string;
  instrumento: string;
  enfoques: string[];
  inicio: string;
  desarrollo: string;
  cierre: string;
  materiales: string;
  status: PlanStatus;
  observacion: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  ownerUid: string;
  ownerName: string;
  area: string;
  aula: string;
  title: string;
  instructions: string;
  dueDate: string;
  competencia: string;
  createdAt: string;
}

export interface TaskResponse {
  studentId: string;
  studentName: string;
  text: string;
  submittedAt: string;
  feedback?: string;
  literal?: string;
  reviewedAt?: string;
  reviewer?: string;
}

export interface FitnessRecord {
  id: string;
  studentId: string;
  studentName: string;
  aula: string;
  date: string;
  weightKg: number;
  heightCm: number;
  imc: number;
  flexCm?: number | null;
  abdominales?: number | null;
  cooperM?: number | null;
  notes: string;
  ownerUid: string;
  createdAt: string;
}

export interface Codes { docente: string; auxiliar: string }

export interface WorkspaceData {
  config: InstitutionConfig;
  profile: DirectorProfile;
  students: Student[];
}

// =====================================================================
// Ayudas
// =====================================================================

export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código legible sin letras que se confunden (sin 0/O ni 1/I). */
export function randomCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function portalUrl(token: string): string {
  return `${window.location.origin}/c/${token}`;
}

/** Saca el código del carnet a partir del texto leído en el QR. */
export function tokenFromQr(value: string): string | null {
  const v = (value || '').trim();
  const m = v.match(/\/c\/([a-f0-9]{16,64})\/?$/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-f0-9]{16,64}$/i.test(v)) return v.toLowerCase();
  return null;
}

export function todayIn(timeZone = 'America/Lima'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function nowTimeIn(timeZone = 'America/Lima'): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

/** Puntual hasta la hora límite (incluida); después, tardanza. */
export function statusForTime(time: string, cutoff: string): AttendanceStatus {
  return time <= `${cutoff || '07:45'}:59` ? 'Puntual' : 'Tardanza';
}

export interface Counters { present: number; late: number; absent: number; justified: number }

export function withCounters(s: Student, c: Counters): Student {
  const total = c.present + c.late + c.absent + c.justified;
  const attended = c.present + c.late + c.justified;
  return {
    ...s,
    presentDays: c.present,
    lateDays: c.late,
    absentDays: c.absent,
    justifiedDays: c.justified,
    totalDays: total,
    attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
  };
}

const COUNTER_FIELD: Record<AttendanceStatus, 'presentDays' | 'lateDays' | 'absentDays' | 'justifiedDays'> = {
  Puntual: 'presentDays', Tardanza: 'lateDays', Inasistencia: 'absentDays', Justificada: 'justifiedDays',
};

/** Aplica en memoria el cambio de contadores de asistencia de un alumno. */
export function bumpCounters(s: Student, status: AttendanceStatus, delta: 1 | -1): Student {
  return withCounters(s, {
    present: (s.presentDays || 0) + (status === 'Puntual' ? delta : 0),
    late: (s.lateDays || 0) + (status === 'Tardanza' ? delta : 0),
    absent: (s.absentDays || 0) + (status === 'Inasistencia' ? delta : 0),
    justified: (s.justifiedDays || 0) + (status === 'Justificada' ? delta : 0),
  });
}

const nowIso = () => new Date().toISOString();

/** Firestore no acepta `undefined`; esto deja solo valores guardables. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Campos del alumno que se guardan (sin los derivados). */
function studentDoc(s: Student, institutionId: string) {
  const { qrCodeValue, attendanceRate, attendanceHistory, ...rest } = s;
  void attendanceRate; void attendanceHistory;
  return clean({ ...rest, institutionId, qrToken: tokenFromQr(qrCodeValue) || randomToken(), updatedAt: nowIso() });
}

function studentFromDoc(id: string, d: Record<string, unknown>): Student {
  const s = d as unknown as Student & { qrToken: string };
  return withCounters({ ...s, id, qrCodeValue: portalUrl(s.qrToken) }, {
    present: s.presentDays || 0, late: s.lateDays || 0, absent: s.absentDays || 0, justified: s.justifiedDays || 0,
  });
}

/** Lo que ve la familia al escanear el carnet (sin DNI, dirección ni teléfono). */
function portalSnapshot(s: Student, institutionId: string, config: InstitutionConfig) {
  return clean({
    institutionId,
    student: { fullName: s.fullName, gradeLevel: s.gradeLevel, section: s.section, avatarUrl: s.avatarUrl || '', grades: s.grades || [] },
    institution: {
      name: config.institutionName, shortName: config.shortName, academicYear: config.academicYear,
      activePeriod: config.activePeriod, periodType: config.periodType,
    },
    updatedAt: nowIso(),
  });
}

async function commitInChunks(db: Firestore, ops: ((b: WriteBatch) => void)[], perBatch = 400) {
  for (let i = 0; i < ops.length; i += perBatch) {
    const b = writeBatch(db);
    ops.slice(i, i + perBatch).forEach((op) => op(b));
    await b.commit();
  }
}

// =====================================================================
// Panel del personal (dirección, docentes y personal de puerta)
// =====================================================================

export type StaffStore = ReturnType<typeof createStaffStore>;

export function createStaffStore(me: UserProfile) {
  const { db } = fb();
  const iid = me.institutionId;
  const role = me.role as StaffRole;
  const inst = doc(db, 'institutions', iid);
  const col = (name: string) => collection(db, 'institutions', iid, name);
  const sub = (name: string, id: string) => doc(db, 'institutions', iid, name, id);
  let config: InstitutionConfig = DEFAULT_INSTITUTION_CONFIG;

  const syncPortal = (b: WriteBatch, s: Student) => {
    const token = tokenFromQr(s.qrCodeValue);
    if (token) b.set(doc(db, 'portals', token), portalSnapshot(s, iid, config), { merge: true });
  };

  return {
    me,
    role,
    userName: me.fullName,

    async load(): Promise<WorkspaceData> {
      const snap = await getDoc(inst);
      if (!snap.exists()) throw new Error('No encontramos tu colegio. Es posible que la dirección te haya quitado el acceso.');
      const d = snap.data();
      config = { ...DEFAULT_INSTITUTION_CONFIG, ...(d.config || {}) };
      const rows = await getDocs(query(col('students'), limit(5000)));
      const students = rows.docs.map((r) => studentFromDoc(r.id, r.data())).sort((a, b) => a.fullName.localeCompare(b.fullName));
      return { config, profile: { ...DEFAULT_DIRECTOR_PROFILE, ...(d.profile || {}) }, students };
    },

    async saveConfig(next: InstitutionConfig) {
      config = next;
      await updateDoc(inst, { config: clean(next), name: next.institutionName, updatedAt: nowIso() });
    },

    async saveProfile(profile: DirectorProfile) {
      await updateDoc(inst, { profile: clean(profile), updatedAt: nowIso() });
    },

    /** Matricula alumnos nuevos con su QR y sus códigos de acceso. */
    async addStudents(list: Student[]): Promise<Student[]> {
      const out = list.map((s) => ({
        ...withCounters(s, { present: 0, late: 0, absent: 0, justified: 0 }),
        id: s.id?.startsWith('st_') ? s.id : `st_${randomToken()}`,
        qrCodeValue: tokenFromQr(s.qrCodeValue) ? s.qrCodeValue : portalUrl(randomToken()),
        studentCode: s.studentCode || randomCode(10),
        familyCode: s.familyCode || randomCode(10),
      }));
      await commitInChunks(db, out.map((s) => (b: WriteBatch) => {
        b.set(sub('students', s.id), { ...studentDoc(s, iid), createdAt: nowIso() });
        b.set(doc(db, 'linkCodes', s.studentCode!), { institutionId: iid, studentId: s.id, kind: 'estudiante' });
        b.set(doc(db, 'linkCodes', s.familyCode!), { institutionId: iid, studentId: s.id, kind: 'familia' });
        syncPortal(b, s);
      }), 100);
      return out;
    },

    /** Dirección: guarda la ficha completa. Docentes: solo las notas. */
    async updateStudents(list: Student[]) {
      await commitInChunks(db, list.map((s) => (b: WriteBatch) => {
        if (role === 'director') {
          const { presentDays, lateDays, absentDays, justifiedDays, totalDays, ...data } = studentDoc(s, iid) as Record<string, unknown>;
          void presentDays; void lateDays; void absentDays; void justifiedDays; void totalDays;
          b.update(sub('students', s.id), data);
        } else {
          b.update(sub('students', s.id), { grades: clean(s.grades || []), updatedAt: nowIso() });
        }
        syncPortal(b, s);
      }), 200);
    },

    /** Genera un QR nuevo: el carnet anterior deja de funcionar. */
    async replaceQr(s: Student): Promise<Student> {
      const old = tokenFromQr(s.qrCodeValue);
      const next = { ...s, qrCodeValue: portalUrl(randomToken()) };
      const b = writeBatch(db);
      b.update(sub('students', s.id), { qrToken: tokenFromQr(next.qrCodeValue), updatedAt: nowIso() });
      if (old) b.delete(doc(db, 'portals', old));
      b.set(doc(db, 'portals', tokenFromQr(next.qrCodeValue)!), portalSnapshot(next, iid, config));
      await b.commit();
      return next;
    },

    async deleteStudent(s: Student) {
      const b = writeBatch(db);
      b.delete(sub('students', s.id));
      if (s.studentCode) b.delete(doc(db, 'linkCodes', s.studentCode));
      if (s.familyCode) b.delete(doc(db, 'linkCodes', s.familyCode));
      const token = tokenFromQr(s.qrCodeValue);
      if (token) b.delete(doc(db, 'portals', token));
      await b.commit();
      const recs = await getDocs(query(col('attendance'), where('studentId', '==', s.id)));
      await commitInChunks(db, recs.docs.map((r) => (bb: WriteBatch) => bb.delete(r.ref)));
    },

    // ----- Asistencia -----

    watchAttendance(day: string, onChange: (list: AttendanceRecord[]) => void, onError?: (e: unknown) => void) {
      return onSnapshot(
        query(col('attendance'), where('day', '==', day)),
        (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }))),
        (e) => onError?.(e),
      );
    },

    async registerScan(token: string, known?: Student[]): Promise<ScanResult> {
      let st = known?.find((s) => tokenFromQr(s.qrCodeValue) === token);
      if (!st) {
        const found = await getDocs(query(col('students'), where('qrToken', '==', token), limit(1)));
        if (found.empty) return { ok: false, error: 'QR no registrado en este colegio.' };
        st = studentFromDoc(found.docs[0].id, found.docs[0].data());
      }
      const tz = config.timeZone || 'America/Lima';
      const day = todayIn(tz);
      const time = nowTimeIn(tz);
      const status = statusForTime(time, config.punctualCutoffTime);
      const ref = sub('attendance', `${day}_${st.id}`);
      const student = st;
      const res = await runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        if (cur.exists()) {
          const d = cur.data() as AttendanceRecord;
          return { ok: true, duplicate: true, student, status: d.status, time: d.time || '' } as ScanResult;
        }
        tx.set(ref, { studentId: student.id, day, time, status, recordedBy: me.fullName, createdAt: nowIso() });
        tx.update(sub('students', student.id), { [COUNTER_FIELD[status]]: increment(1), totalDays: increment(1) });
        tx.set(doc(db, 'portals', token), { institutionId: iid, att: { [day]: { t: time.slice(0, 5), s: status } } }, { merge: true });
        return { ok: true, duplicate: false, student, status, time } as ScanResult;
      });
      return res;
    },

    async setAttendanceStatus(rec: AttendanceRecord, status: AttendanceStatus, s?: Student) {
      if (rec.status === status) return;
      const b = writeBatch(db);
      b.update(sub('attendance', rec.id), { status, editedBy: me.fullName, editedAt: nowIso() });
      b.update(sub('students', rec.studentId), { [COUNTER_FIELD[rec.status]]: increment(-1), [COUNTER_FIELD[status]]: increment(1) });
      const token = s && tokenFromQr(s.qrCodeValue);
      if (token) b.set(doc(db, 'portals', token), { institutionId: iid, att: { [rec.day]: { t: rec.time?.slice(0, 5) || '', s: status } } }, { merge: true });
      await b.commit();
    },

    /** Marca como inasistencia a quienes no registraron ingreso en el día. */
    async closeDay(day: string, students: Student[], records: AttendanceRecord[]): Promise<number> {
      const seen = new Set(records.map((r) => r.studentId));
      const missing = students.filter((s) => !seen.has(s.id));
      await commitInChunks(db, missing.map((s) => (b: WriteBatch) => {
        b.set(sub('attendance', `${day}_${s.id}`), { studentId: s.id, day, time: null, status: 'Inasistencia', recordedBy: 'Cierre del día', createdAt: nowIso() });
        b.update(sub('students', s.id), { absentDays: increment(1), totalDays: increment(1) });
        const token = tokenFromQr(s.qrCodeValue);
        if (token) b.set(doc(db, 'portals', token), { institutionId: iid, att: { [day]: { t: '', s: 'Inasistencia' } } }, { merge: true });
      }), 120);
      return missing.length;
    },

    // ----- Comunicados -----

    async listAnnouncements(): Promise<Announcement[]> {
      const snap = await getDocs(query(col('announcements'), orderBy('createdAt', 'desc'), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }));
    },

    async addAnnouncement(audience: Announcement['audience'], body: string) {
      const id = `an_${randomToken()}`;
      await setDoc(sub('announcements', id), { audience, body, authorName: me.fullName, authorUid: me.uid, createdAt: nowIso() });
      await this.syncBoard();
    },

    async deleteAnnouncement(id: string) {
      await deleteDoc(sub('announcements', id));
      await this.syncBoard();
    },

    /** Publica los últimos comunicados para el portal del carnet (sin cuenta). */
    async syncBoard() {
      const list = await this.listAnnouncements();
      await setDoc(doc(db, 'boards', iid), {
        institutionId: iid,
        announcements: list.slice(0, 10).map((a) => ({ body: a.body, author: a.authorName, at: a.createdAt, audience: a.audience })),
      });
    },

    // ----- Equipo y códigos -----

    async listMembers(): Promise<UserProfile[]> {
      const snap = await getDocs(query(collection(db, 'users'), where('institutionId', '==', iid)));
      return snap.docs.map((d) => d.data() as UserProfile).sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName));
    },

    async removeMember(uid: string) {
      await deleteDoc(doc(db, 'users', uid));
    },

    async getCodes(): Promise<Codes | null> {
      const snap = await getDoc(doc(db, 'institutions', iid, 'private', 'codes'));
      return snap.exists() ? (snap.data() as Codes) : null;
    },

    async rotateCodes(): Promise<Codes> {
      const old = await this.getCodes();
      const next: Codes = { docente: randomCode(8), auxiliar: randomCode(8) };
      const b = writeBatch(db);
      if (old) { b.delete(doc(db, 'joinCodes', old.docente)); b.delete(doc(db, 'joinCodes', old.auxiliar)); }
      b.set(doc(db, 'joinCodes', next.docente), { institutionId: iid, role: 'docente' });
      b.set(doc(db, 'joinCodes', next.auxiliar), { institutionId: iid, role: 'auxiliar' });
      b.set(doc(db, 'institutions', iid, 'private', 'codes'), next);
      await b.commit();
      return next;
    },

    async updateMe(patch: Partial<Pick<UserProfile, 'fullName' | 'areas' | 'levels' | 'aulas' | 'phone'>>) {
      await updateDoc(doc(db, 'users', me.uid), clean(patch));
      Object.assign(me, patch);
    },

    // ----- Planificación (unidades y sesiones) -----

    async listPlans(): Promise<Plan[]> {
      const q = role === 'director' ? query(col('plans')) : query(col('plans'), where('ownerUid', '==', me.uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, 'id'>) })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async savePlan(p: Plan): Promise<Plan> {
      const id = p.id || `pl_${randomToken()}`;
      const next = { ...p, id, ownerUid: p.ownerUid || me.uid, ownerName: p.ownerName || me.fullName, updatedAt: nowIso() };
      const { id: _id, ...data } = next;
      void _id;
      await setDoc(sub('plans', id), clean(data));
      return next;
    },

    async deletePlan(id: string) { await deleteDoc(sub('plans', id)); },

    // ----- Actividades para estudiantes -----

    async listTasks(): Promise<Task[]> {
      const q = role === 'director' ? query(col('tasks')) : query(col('tasks'), where('ownerUid', '==', me.uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async saveTask(t: Omit<Task, 'id' | 'ownerUid' | 'ownerName' | 'createdAt'> & Partial<Task>): Promise<void> {
      const id = t.id || `tk_${randomToken()}`;
      await setDoc(sub('tasks', id), clean({
        area: t.area, aula: t.aula, title: t.title, instructions: t.instructions, dueDate: t.dueDate, competencia: t.competencia,
        ownerUid: t.ownerUid || me.uid, ownerName: t.ownerName || me.fullName, createdAt: t.createdAt || nowIso(),
      }));
    },

    async deleteTask(id: string) {
      const responses = await getDocs(collection(db, 'institutions', iid, 'tasks', id, 'responses'));
      await commitInChunks(db, responses.docs.map((r) => (b: WriteBatch) => b.delete(r.ref)));
      await deleteDoc(sub('tasks', id));
    },

    async listResponses(taskId: string): Promise<TaskResponse[]> {
      const snap = await getDocs(collection(db, 'institutions', iid, 'tasks', taskId, 'responses'));
      return snap.docs.map((d) => d.data() as TaskResponse);
    },

    async reviewResponse(taskId: string, studentId: string, feedback: string, literal: string) {
      await updateDoc(doc(db, 'institutions', iid, 'tasks', taskId, 'responses', studentId), {
        feedback, literal, reviewedAt: nowIso(), reviewer: me.fullName,
      });
    },

    // ----- Evaluación física (Educación Física) -----

    async listFitness(): Promise<FitnessRecord[]> {
      const snap = await getDocs(query(col('fitness'), limit(5000)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FitnessRecord, 'id'>) })).sort((a, b) => b.date.localeCompare(a.date));
    },

    async saveFitness(r: Omit<FitnessRecord, 'id' | 'ownerUid' | 'createdAt'>) {
      const id = `fx_${randomToken()}`;
      await setDoc(sub('fitness', id), clean({ ...r, ownerUid: me.uid, createdAt: nowIso() }));
    },

    async deleteFitness(id: string) { await deleteDoc(sub('fitness', id)); },
  };
}

// =====================================================================
// Estudiantes y familias
// =====================================================================

export type FamilyStore = ReturnType<typeof createFamilyStore>;

export interface InstitutionSummary {
  name: string;
  shortName: string;
  academicYear: string;
  activePeriod: string;
  periodType: InstitutionConfig['periodType'];
  punctualCutoffTime: string;
}

export function createFamilyStore(me: UserProfile) {
  const { db } = fb();
  const iid = me.institutionId;

  return {
    me,
    role: me.role as 'estudiante' | 'familia',

    async load(): Promise<{ institution: InstitutionSummary; config: InstitutionConfig; students: Student[] }> {
      const snap = await getDoc(doc(db, 'institutions', iid));
      if (!snap.exists()) throw new Error('No encontramos el colegio vinculado a tu cuenta.');
      const config: InstitutionConfig = { ...DEFAULT_INSTITUTION_CONFIG, ...(snap.data().config || {}) };
      const students: Student[] = [];
      for (const sid of me.studentIds || []) {
        const s = await getDoc(doc(db, 'institutions', iid, 'students', sid));
        if (s.exists()) students.push(studentFromDoc(s.id, s.data()));
      }
      return {
        config,
        institution: {
          name: config.institutionName, shortName: config.shortName, academicYear: config.academicYear,
          activePeriod: config.activePeriod, periodType: config.periodType, punctualCutoffTime: config.punctualCutoffTime,
        },
        students,
      };
    },

    async listAttendance(studentId: string): Promise<AttendanceRecord[]> {
      const snap = await getDocs(query(collection(db, 'institutions', iid, 'attendance'), where('studentId', '==', studentId)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) })).sort((a, b) => b.day.localeCompare(a.day));
    },

    async listAnnouncements(): Promise<Announcement[]> {
      const snap = await getDocs(query(collection(db, 'institutions', iid, 'announcements'), orderBy('createdAt', 'desc'), limit(30)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }));
    },

    async listTasks(aula: string): Promise<Task[]> {
      const snap = await getDocs(query(collection(db, 'institutions', iid, 'tasks'), where('aula', '==', aula)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getResponse(taskId: string, studentId: string): Promise<TaskResponse | null> {
      const snap = await getDoc(doc(db, 'institutions', iid, 'tasks', taskId, 'responses', studentId));
      return snap.exists() ? (snap.data() as TaskResponse) : null;
    },

    async submitResponse(taskId: string, student: Student, text: string) {
      const ref = doc(db, 'institutions', iid, 'tasks', taskId, 'responses', student.id);
      const cur = await getDoc(ref);
      if (cur.exists()) await updateDoc(ref, { text, submittedAt: nowIso() });
      else await setDoc(ref, { studentId: student.id, studentName: student.fullName, text, submittedAt: nowIso() });
    },

    async listFitness(studentId: string): Promise<FitnessRecord[]> {
      const snap = await getDocs(query(collection(db, 'institutions', iid, 'fitness'), where('studentId', '==', studentId)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FitnessRecord, 'id'>) })).sort((a, b) => b.date.localeCompare(a.date));
    },
  };
}

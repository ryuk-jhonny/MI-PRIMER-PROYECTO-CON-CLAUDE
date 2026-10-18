import { Student, Teacher } from '../types/education';
import { InstitutionConfig, DirectorProfile, DEFAULT_INSTITUTION_CONFIG, DEFAULT_DIRECTOR_PROFILE } from '../types/institution';
import { INITIAL_STUDENTS, INITIAL_TEACHERS } from '../data/mockData';
import { requireSupabase } from './supabase';
import { canonicalGrades } from './school';

// =====================================================================
// Tipos compartidos
// =====================================================================

export type Role = 'director' | 'docente' | 'auxiliar';
export type AttendanceStatus = 'Puntual' | 'Tardanza' | 'Justificada' | 'Inasistencia';

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
  audience: 'all' | 'inicial' | 'primaria' | 'secundaria';
  body: string;
  authorName: string;
  createdAt: string;
}

export interface Member {
  userId: string;
  role: Role;
  fullName: string;
  email: string;
}

export interface ScanResult {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  student?: Student;
  status?: AttendanceStatus;
  time?: string;
}

export interface WorkspaceData {
  config: InstitutionConfig;
  profile: DirectorProfile;
  students: Student[];
  teachers: Teacher[];
  codes?: { teacher: string; staff: string };
}

export interface DataStore {
  mode: 'cloud' | 'demo';
  role: Role;
  userName: string;
  load(): Promise<WorkspaceData>;
  saveConfig(config: InstitutionConfig): Promise<void>;
  saveProfile(profile: DirectorProfile): Promise<void>;
  saveStudents(next: Student[]): Promise<void>;
  saveTeachers(next: Teacher[]): Promise<void>;
  listAttendance(day: string): Promise<AttendanceRecord[]>;
  registerScan(token: string): Promise<ScanResult>;
  setAttendanceStatus(recordId: string, status: AttendanceStatus): Promise<void>;
  closeDay(day: string): Promise<number>;
  listAnnouncements(): Promise<Announcement[]>;
  addAnnouncement(audience: Announcement['audience'], body: string): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;
  listMembers(): Promise<Member[]>;
  removeMember(userId: string): Promise<void>;
  rotateCodes(): Promise<{ teacher: string; staff: string }>;
  subscribeAttendance(onChange: () => void): () => void;
}

// =====================================================================
// Ayudas
// =====================================================================

export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function portalUrl(token: string): string {
  return `${window.location.origin}/c/${token}`;
}

/** Saca el código del carnet a partir del texto leído en el QR. */
export function tokenFromQr(value: string): string | null {
  const v = value.trim();
  const m = v.match(/\/c\/([a-f0-9]{16,64})\/?$/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-f0-9]{16,64}$/i.test(v)) return v.toLowerCase();
  return null;
}

/**
 * Garantiza que cada alumno tenga un identificador único global (para que no choque
 * con el de otro colegio) y un QR seguro que abre su portal.
 */
export function normalizeStudents(list: Student[]): Student[] {
  return list.map((s) => {
    let out = s;
    if (!s.id?.startsWith('st_')) out = { ...out, id: `st_${randomToken()}` };
    if (!tokenFromQr(s.qrCodeValue || '')) out = { ...out, qrCodeValue: portalUrl(randomToken()) };
    return out;
  });
}

export function normalizeTeachers(list: Teacher[]): Teacher[] {
  return list.map((t) => (t.id?.startsWith('tc_') ? t : { ...t, id: `tc_${randomToken()}` }));
}

export function todayIn(timeZone = 'America/Lima'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function nowTimeIn(timeZone = 'America/Lima'): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

export function withCounters(s: Student, c: { present: number; late: number; absent: number; justified: number }): Student {
  const total = c.present + c.late + c.absent + c.justified;
  const attended = c.present + c.late + c.justified;
  return {
    ...s,
    presentDays: c.present,
    lateDays: c.late,
    absentDays: c.absent,
    totalDays: total,
    attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
  };
}

function stripCounters(s: Student): Student {
  const { presentDays, lateDays, absentDays, totalDays, attendanceRate, attendanceHistory, ...rest } = s;
  void presentDays; void lateDays; void absentDays; void totalDays; void attendanceRate; void attendanceHistory;
  return { ...rest, presentDays: 0, lateDays: 0, absentDays: 0, totalDays: 0, attendanceRate: 0 } as Student;
}

// =====================================================================
// Modo demostración: todo vive en este navegador
// =====================================================================

const K = {
  config: 'ryuk_demo_config',
  profile: 'ryuk_demo_profile',
  students: 'ryuk_demo_students',
  teachers: 'ryuk_demo_teachers',
  attendance: 'ryuk_demo_attendance',
  announcements: 'ryuk_demo_announcements',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o bloqueado: se mantiene en memoria */
  }
}

/** Historial de ejemplo de los últimos 15 días hábiles (sin incluir hoy). */
function seedDemoAttendance(students: Student[]): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const d = new Date();
  let added = 0;
  while (added < 15) {
    d.setDate(d.getDate() - 1);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    added++;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    students.forEach((s, i) => {
      const r = (i * 7 + added * 13) % 29;
      const status: AttendanceStatus = r === 0 ? 'Inasistencia' : r < 3 ? 'Tardanza' : r === 3 ? 'Justificada' : 'Puntual';
      const minute = status === 'Tardanza' ? 50 + (r % 9) : 20 + ((i + added) % 24);
      out.push({
        id: randomToken(), studentId: s.id, day, status, recordedBy: 'Datos de ejemplo',
        time: status === 'Inasistencia' ? null : `07:${String(minute).padStart(2, '0')}:00`,
      });
    });
  }
  return out;
}

export function createDemoStore(): DataStore {
  const tz = () => read<InstitutionConfig>(K.config, DEFAULT_INSTITUTION_CONFIG).timeZone || 'America/Lima';

  const recount = (studentId: string) => {
    const recs = read<AttendanceRecord[]>(K.attendance, []).filter((r) => r.studentId === studentId);
    const students = read<Student[]>(K.students, []);
    const c = { present: 0, late: 0, absent: 0, justified: 0 };
    recs.forEach((r) => {
      if (r.status === 'Puntual') c.present++;
      else if (r.status === 'Tardanza') c.late++;
      else if (r.status === 'Inasistencia') c.absent++;
      else c.justified++;
    });
    write(K.students, students.map((s) => (s.id === studentId ? withCounters(s, c) : s)));
  };

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());

  return {
    mode: 'demo',
    role: 'director',
    userName: read<DirectorProfile>(K.profile, DEFAULT_DIRECTOR_PROFILE).name,
    async load() {
      if (!localStorage.getItem(K.students)) {
        const seeded = normalizeStudents(INITIAL_STUDENTS.map((s) => canonicalGrades(stripCounters(s))));
        write(K.students, seeded);
        write(K.attendance, seedDemoAttendance(seeded));
        seeded.forEach((s) => recount(s.id));
      }
      if (!localStorage.getItem(K.teachers)) write(K.teachers, normalizeTeachers(INITIAL_TEACHERS));
      if (!localStorage.getItem(K.config)) write(K.config, DEFAULT_INSTITUTION_CONFIG);
      return {
        config: { ...DEFAULT_INSTITUTION_CONFIG, ...read(K.config, DEFAULT_INSTITUTION_CONFIG) },
        profile: { ...DEFAULT_DIRECTOR_PROFILE, ...read(K.profile, DEFAULT_DIRECTOR_PROFILE) },
        students: normalizeStudents(read<Student[]>(K.students, [])),
        teachers: read<Teacher[]>(K.teachers, []),
        codes: { teacher: 'DEMO-DOC', staff: 'DEMO-AUX' },
      };
    },
    async saveConfig(config) { write(K.config, config); },
    async saveProfile(profile) { write(K.profile, profile); },
    async saveStudents(next) {
      write(K.students, next);
      const ids = new Set(next.map((s) => s.id));
      write(K.attendance, read<AttendanceRecord[]>(K.attendance, []).filter((r) => ids.has(r.studentId)));
    },
    async saveTeachers(next) { write(K.teachers, next); },
    async listAttendance(day) {
      return read<AttendanceRecord[]>(K.attendance, []).filter((r) => r.day === day);
    },
    async registerScan(token) {
      const students = read<Student[]>(K.students, []);
      const st = students.find((s) => tokenFromQr(s.qrCodeValue) === token);
      if (!st) return { ok: false, error: 'QR no registrado en este colegio' };
      const cfg = read<InstitutionConfig>(K.config, DEFAULT_INSTITUTION_CONFIG);
      const day = todayIn(tz());
      const all = read<AttendanceRecord[]>(K.attendance, []);
      const existing = all.find((r) => r.studentId === st.id && r.day === day);
      if (existing) return { ok: true, duplicate: true, student: st, status: existing.status, time: existing.time || '' };
      const time = nowTimeIn(tz());
      const cutoff = (cfg.punctualCutoffTime || '07:45') + ':00';
      const status: AttendanceStatus = time <= cutoff ? 'Puntual' : 'Tardanza';
      all.push({ id: randomToken(), studentId: st.id, day, time, status, recordedBy: 'Modo demo' });
      write(K.attendance, all);
      recount(st.id);
      notify();
      return { ok: true, duplicate: false, student: st, status, time };
    },
    async setAttendanceStatus(recordId, status) {
      const all = read<AttendanceRecord[]>(K.attendance, []);
      const rec = all.find((r) => r.id === recordId);
      if (!rec) return;
      rec.status = status;
      write(K.attendance, all);
      recount(rec.studentId);
      notify();
    },
    async closeDay(day) {
      const students = read<Student[]>(K.students, []);
      const all = read<AttendanceRecord[]>(K.attendance, []);
      const seen = new Set(all.filter((r) => r.day === day).map((r) => r.studentId));
      const missing = students.filter((s) => !seen.has(s.id));
      missing.forEach((s) => all.push({ id: randomToken(), studentId: s.id, day, time: null, status: 'Inasistencia', recordedBy: 'Cierre del día' }));
      write(K.attendance, all);
      missing.forEach((s) => recount(s.id));
      notify();
      return missing.length;
    },
    async listAnnouncements() { return read<Announcement[]>(K.announcements, []); },
    async addAnnouncement(audience, body) {
      const list = read<Announcement[]>(K.announcements, []);
      const author = read<DirectorProfile>(K.profile, DEFAULT_DIRECTOR_PROFILE).name;
      write(K.announcements, [{ id: randomToken(), audience, body, authorName: author, createdAt: new Date().toISOString() }, ...list]);
    },
    async deleteAnnouncement(id) {
      write(K.announcements, read<Announcement[]>(K.announcements, []).filter((a) => a.id !== id));
    },
    async listMembers() {
      const p = read<DirectorProfile>(K.profile, DEFAULT_DIRECTOR_PROFILE);
      return [{ userId: 'demo', role: 'director', fullName: p.name, email: p.email }];
    },
    async removeMember() { /* sin equipo en modo demo */ },
    async rotateCodes() { return { teacher: 'DEMO-DOC', staff: 'DEMO-AUX' }; },
    subscribeAttendance(onChange) {
      listeners.add(onChange);
      const onStorage = (e: StorageEvent) => { if (e.key === K.attendance) onChange(); };
      window.addEventListener('storage', onStorage);
      return () => { listeners.delete(onChange); window.removeEventListener('storage', onStorage); };
    },
  };
}

/** Borra los datos del modo demostración para empezar de cero. */
export function resetDemoData() {
  Object.values(K).forEach((k) => { try { localStorage.removeItem(k); } catch { /* nada */ } });
}

// =====================================================================
// Modo nube (Supabase)
// =====================================================================

interface StudentRow {
  id: string;
  qr_token: string;
  data: Student;
  present_days: number;
  late_days: number;
  absent_days: number;
  justified_days: number;
}

export function createCloudStore(institutionId: string, role: Role, userName: string): DataStore {
  const sb = requireSupabase();
  let studentSnapshot = new Map<string, string>();
  let teacherSnapshot = new Map<string, string>();

  const check = <T,>(res: { data: T; error: unknown }): T => {
    if (res.error) throw res.error;
    return res.data;
  };

  const mapRecord = (r: { id: string; student_id: string; day: string; time_in: string | null; status: AttendanceStatus; recorded_by_name: string }): AttendanceRecord => ({
    id: r.id, studentId: r.student_id, day: r.day, time: r.time_in, status: r.status, recordedBy: r.recorded_by_name,
  });

  return {
    mode: 'cloud',
    role,
    userName,
    async load() {
      const inst = check(await sb.from('institutions').select('name, config, director_profile, teacher_code, staff_code').eq('id', institutionId).single()) as {
        name: string; config: InstitutionConfig; director_profile: DirectorProfile; teacher_code: string; staff_code: string;
      };
      const rows = check(await sb.from('students').select('id, qr_token, data, present_days, late_days, absent_days, justified_days').eq('institution_id', institutionId).order('updated_at', { ascending: false }).limit(5000)) as StudentRow[];
      const tRows = check(await sb.from('teachers').select('id, data').eq('institution_id', institutionId).order('updated_at', { ascending: false })) as { id: string; data: Teacher }[];
      const config = { ...DEFAULT_INSTITUTION_CONFIG, ...inst.config };
      const students = rows.map((r) =>
        withCounters({ ...r.data, id: r.id, qrCodeValue: portalUrl(r.qr_token) }, {
          present: r.present_days, late: r.late_days, absent: r.absent_days, justified: r.justified_days,
        }),
      );
      studentSnapshot = new Map(students.map((s) => [s.id, JSON.stringify(stripCounters(s))]));
      const teachers = tRows.map((r) => ({ ...r.data, id: r.id }));
      teacherSnapshot = new Map(teachers.map((t) => [t.id, JSON.stringify(t)]));
      return {
        config,
        profile: { ...DEFAULT_DIRECTOR_PROFILE, ...inst.director_profile },
        students,
        teachers,
        codes: role === 'director' ? { teacher: inst.teacher_code, staff: inst.staff_code } : undefined,
      };
    },
    async saveConfig(config) {
      check(await sb.from('institutions').update({ config, name: config.institutionName }).eq('id', institutionId));
    },
    async saveProfile(profile) {
      check(await sb.from('institutions').update({ director_profile: profile }).eq('id', institutionId));
    },
    async saveStudents(next) {
      const nextMap = new Map(next.map((s) => [s.id, JSON.stringify(stripCounters(s))]));
      const changed = next.filter((s) => studentSnapshot.get(s.id) !== nextMap.get(s.id));
      const removed = [...studentSnapshot.keys()].filter((id) => !nextMap.has(id));
      if (role !== 'director') {
        // Docentes solo pueden actualizar (notas), no crear ni borrar alumnos.
        for (const s of changed) {
          check(await sb.from('students').update({ data: stripCounters(s), updated_at: new Date().toISOString() }).eq('id', s.id));
        }
        studentSnapshot = new Map([...studentSnapshot, ...changed.map((s) => [s.id, nextMap.get(s.id)!] as [string, string])]);
        return;
      }
      for (let i = 0; i < changed.length; i += 300) {
        const batch = changed.slice(i, i + 300).map((s) => ({
          id: s.id,
          institution_id: institutionId,
          qr_token: tokenFromQr(s.qrCodeValue) || randomToken(),
          data: stripCounters(s),
          updated_at: new Date().toISOString(),
        }));
        check(await sb.from('students').upsert(batch, { onConflict: 'id' }));
      }
      for (let i = 0; i < removed.length; i += 300) {
        check(await sb.from('students').delete().in('id', removed.slice(i, i + 300)).eq('institution_id', institutionId));
      }
      studentSnapshot = nextMap;
    },
    async saveTeachers(next) {
      const nextMap = new Map(next.map((t) => [t.id, JSON.stringify(t)]));
      const changed = next.filter((t) => teacherSnapshot.get(t.id) !== nextMap.get(t.id));
      const removed = [...teacherSnapshot.keys()].filter((id) => !nextMap.has(id));
      if (changed.length) {
        check(await sb.from('teachers').upsert(changed.map((t) => ({ id: t.id, institution_id: institutionId, data: t, updated_at: new Date().toISOString() })), { onConflict: 'id' }));
      }
      if (removed.length) check(await sb.from('teachers').delete().in('id', removed).eq('institution_id', institutionId));
      teacherSnapshot = nextMap;
    },
    async listAttendance(day) {
      const rows = check(await sb.from('attendance').select('id, student_id, day, time_in, status, recorded_by_name').eq('institution_id', institutionId).eq('day', day).order('created_at', { ascending: false }).limit(5000));
      return (rows as Parameters<typeof mapRecord>[0][]).map(mapRecord);
    },
    async registerScan(token) {
      const res = check(await sb.rpc('register_scan', { p_token: token })) as ScanResult;
      return res;
    },
    async setAttendanceStatus(recordId, status) {
      check(await sb.from('attendance').update({ status }).eq('id', recordId));
    },
    async closeDay(day) {
      return check(await sb.rpc('close_day', { inst: institutionId, p_day: day })) as number;
    },
    async listAnnouncements() {
      const rows = check(await sb.from('announcements').select('id, audience, body, author_name, created_at').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(50)) as {
        id: string; audience: Announcement['audience']; body: string; author_name: string; created_at: string;
      }[];
      return rows.map((r) => ({ id: r.id, audience: r.audience, body: r.body, authorName: r.author_name, createdAt: r.created_at }));
    },
    async addAnnouncement(audience, body) {
      check(await sb.from('announcements').insert({ institution_id: institutionId, audience, body, author_name: userName }));
    },
    async deleteAnnouncement(id) {
      check(await sb.from('announcements').delete().eq('id', id));
    },
    async listMembers() {
      const rows = check(await sb.from('members').select('user_id, role, full_name, email').eq('institution_id', institutionId).order('created_at')) as {
        user_id: string; role: Role; full_name: string; email: string;
      }[];
      return rows.map((r) => ({ userId: r.user_id, role: r.role, fullName: r.full_name, email: r.email }));
    },
    async removeMember(userId) {
      check(await sb.from('members').delete().eq('institution_id', institutionId).eq('user_id', userId));
    },
    async rotateCodes() {
      check(await sb.rpc('rotate_join_codes', { inst: institutionId }));
      const inst = check(await sb.from('institutions').select('teacher_code, staff_code').eq('id', institutionId).single()) as { teacher_code: string; staff_code: string };
      return { teacher: inst.teacher_code, staff: inst.staff_code };
    },
    subscribeAttendance(onChange) {
      const channel = sb
        .channel(`attendance-${institutionId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `institution_id=eq.${institutionId}` }, () => onChange())
        .subscribe();
      const poll = window.setInterval(onChange, 30000);
      return () => { window.clearInterval(poll); sb.removeChannel(channel); };
    },
  };
}

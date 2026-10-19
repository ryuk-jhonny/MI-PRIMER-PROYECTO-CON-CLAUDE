import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, RulesTestContext, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion, collection, deleteDoc, doc, Firestore, getDoc, getDocs, increment, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';

// Todos los datos de estas pruebas se crean aquí mismo, en el emulador, y se borran entre prueba y prueba.
let env: RulesTestEnvironment;
const IID = 'in_colegio';
const OTHER = 'in_otro';
const SID = 'st_1';
const SID2 = 'st_2';

const db = (uid: string, email = `${uid}@prueba.test`): Firestore =>
  (env.authenticatedContext(uid, { email }) as RulesTestContext).firestore() as unknown as Firestore;
// Sesión anónima de Firebase, como la que abre el carnet QR.
const anonUser = (uid: string): Firestore =>
  (env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }) as RulesTestContext).firestore() as unknown as Firestore;
const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const proof = (token: string, who: string, pin: string) => sha(`ryuk|${token}|${who}|${pin}`);
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore() as unknown as Firestore;
    const user = (uid: string, data: Record<string, unknown>) => setDoc(doc(d, 'users', uid), { uid, email: `${uid}@prueba.test`, fullName: uid, createdAt: '2026-01-01', ...data });
    await setDoc(doc(d, 'institutions', IID), { name: 'Colegio', ownerUid: 'dir', config: {} });
    await setDoc(doc(d, 'institutions', OTHER), { name: 'Otro', ownerUid: 'dir2', config: {} });
    await user('dir', { role: 'director', institutionId: IID });
    await user('dir2', { role: 'director', institutionId: OTHER });
    await user('doc', { role: 'docente', institutionId: IID, areas: ['Matemática'] });
    await user('aux', { role: 'auxiliar', institutionId: IID });
    // Estudiantes y familias entran con el carnet: su perfil guarda el token del QR vigente.
    await user('est', { role: 'estudiante', institutionId: IID, studentIds: [SID], carnetToken: `tok_${SID}` });
    await user('fam', { role: 'familia', institutionId: IID, studentIds: [SID], carnetToken: `tok_${SID}` });
    await setDoc(doc(d, 'institutions', IID, 'private', 'codes'), { docente: 'DOCENTE1', auxiliar: 'AUXILIA1' });
    await setDoc(doc(d, 'joinCodes', 'DOCENTE1'), { institutionId: IID, role: 'docente' });
    await setDoc(doc(d, 'joinCodes', 'AUXILIA1'), { institutionId: IID, role: 'auxiliar' });
    await setDoc(doc(d, 'linkCodes', 'ESTUDIA1'), { institutionId: IID, studentId: SID, kind: 'estudiante' });
    await setDoc(doc(d, 'linkCodes', 'FAMILIA1'), { institutionId: IID, studentId: SID, kind: 'familia' });
    await setDoc(doc(d, 'linkCodes', 'FAMILIA2'), { institutionId: IID, studentId: SID2, kind: 'familia' });
    for (const sid of [SID, SID2]) {
      await setDoc(doc(d, 'institutions', IID, 'students', sid), { fullName: sid, dni: '00000000', grades: [], presentDays: 0, totalDays: 0, qrToken: `tok_${sid}` });
      await setDoc(doc(d, 'portals', `tok_${sid}`), { institutionId: IID, fullName: sid });
    }
    await setDoc(doc(d, 'institutions', IID, 'attendance', `2026-03-10_${SID}`), { studentId: SID, day: '2026-03-10', status: 'Puntual' });
    await setDoc(doc(d, 'institutions', IID, 'attendance', `2026-03-10_${SID2}`), { studentId: SID2, day: '2026-03-10', status: 'Tardanza' });
    await setDoc(doc(d, 'institutions', IID, 'tasks', 't1'), { ownerUid: 'doc', aula: '1° A', title: 'Tarea' });
    await setDoc(doc(d, 'institutions', IID, 'plans', 'p1'), { ownerUid: 'doc', title: 'Unidad 1' });
    await setDoc(doc(d, 'institutions', IID, 'fitness', 'f1'), { ownerUid: 'doc', studentId: SID, imc: 18 });
    await setDoc(doc(d, 'institutions', IID, 'fitness', 'f2'), { ownerUid: 'doc', studentId: SID2, imc: 19 });
    await setDoc(doc(d, 'boards', IID), { institutionId: IID, announcements: [] });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ryuk',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(); });

describe('Registro de un colegio nuevo', () => {
  it('la dirección crea colegio, perfil, códigos y pizarra en un solo lote', async () => {
    const d = db('nuevo');
    const b = writeBatch(d);
    b.set(doc(d, 'institutions', 'in_nuevo'), { name: 'Nuevo', ownerUid: 'nuevo', config: {} });
    b.set(doc(d, 'users', 'nuevo'), { uid: 'nuevo', email: 'nuevo@prueba.test', fullName: 'Ana Pérez', role: 'director', institutionId: 'in_nuevo' });
    b.set(doc(d, 'institutions', 'in_nuevo', 'private', 'codes'), { docente: 'NUEVODO1', auxiliar: 'NUEVOAU1' });
    b.set(doc(d, 'joinCodes', 'NUEVODO1'), { institutionId: 'in_nuevo', role: 'docente' });
    b.set(doc(d, 'joinCodes', 'NUEVOAU1'), { institutionId: 'in_nuevo', role: 'auxiliar' });
    b.set(doc(d, 'boards', 'in_nuevo'), { institutionId: 'in_nuevo', announcements: [] });
    await assertSucceeds(b.commit());
  });

  it('nadie se declara director(a) de un colegio ajeno', async () => {
    const d = db('intruso');
    await assertFails(setDoc(doc(d, 'users', 'intruso'), { uid: 'intruso', email: 'intruso@prueba.test', fullName: 'Intruso', role: 'director', institutionId: IID }));
  });

  it('no se puede tomar un colegio existente', async () => {
    await assertFails(setDoc(doc(db('intruso'), 'institutions', IID), { name: 'Mío', ownerUid: 'intruso' }));
  });

  it('el correo del perfil debe ser el de la cuenta', async () => {
    const d = db('nuevo');
    const b = writeBatch(d);
    b.set(doc(d, 'institutions', 'in_nuevo'), { name: 'Nuevo', ownerUid: 'nuevo' });
    b.set(doc(d, 'users', 'nuevo'), { uid: 'nuevo', email: 'otro@prueba.test', fullName: 'Ana Pérez', role: 'director', institutionId: 'in_nuevo' });
    await assertFails(b.commit());
  });
});

describe('Unirse con un código', () => {
  const profile = (uid: string, extra: Record<string, unknown>) => ({ uid, email: `${uid}@prueba.test`, fullName: 'Persona Nueva', institutionId: IID, ...extra });

  it('docente con código de docente', async () => {
    await assertSucceeds(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente', joinCode: 'DOCENTE1', areas: ['Comunicación'] })));
  });
  it('el código de auxiliar no sirve para entrar como docente', async () => {
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente', joinCode: 'AUXILIA1' })));
  });
  it('sin código válido no se entra', async () => {
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente', joinCode: 'INVENTAD' })));
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente' })));
  });
  it('un código no sirve para otro colegio', async () => {
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), { ...profile('nd', { role: 'docente', joinCode: 'DOCENTE1' }), institutionId: OTHER }));
  });
  it('estudiantes y familias no entran con correo, solo con su carnet', async () => {
    await assertFails(setDoc(doc(db('ne'), 'users', 'ne'), profile('ne', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID] })));
    await assertFails(setDoc(doc(db('nf'), 'users', 'nf'), profile('nf', { role: 'familia', linkCode: 'FAMILIA1', studentIds: [SID] })));
  });
  it('el personal no lleva carnet', async () => {
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente', joinCode: 'DOCENTE1', carnetToken: `tok_${SID}` })));
    await assertFails(setDoc(doc(db('nd'), 'users', 'nd'), profile('nd', { role: 'docente', joinCode: 'DOCENTE1', pinProof: 'x' })));
  });
  it('estudiante no puede vincularse a otra ficha con su código', async () => {
    await assertFails(setDoc(doc(db('ne'), 'users', 'ne'), profile('ne', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID, SID2], carnetToken: `tok_${SID}` })));
  });
  it('el código de estudiante no crea una cuenta de familia', async () => {
    await assertFails(setDoc(doc(db('nf'), 'users', 'nf'), profile('nf', { role: 'familia', linkCode: 'ESTUDIA1', studentIds: [SID], carnetToken: `tok_${SID}` })));
  });
  it('nadie lista los códigos', async () => {
    await assertFails(getDocs(collection(db('doc'), 'joinCodes')));
    await assertFails(getDocs(collection(db('dir'), 'linkCodes')));
    await assertSucceeds(getDoc(doc(db('nd'), 'joinCodes', 'DOCENTE1')));
  });
  it('sin sesión no se consultan códigos', async () => {
    await assertFails(getDoc(doc(anon(), 'joinCodes', 'DOCENTE1')));
  });
});

describe('Perfiles', () => {
  it('nadie se cambia de rol ni de colegio', async () => {
    await assertFails(updateDoc(doc(db('doc'), 'users', 'doc'), { role: 'director' }));
    await assertFails(updateDoc(doc(db('est'), 'users', 'est'), { institutionId: OTHER }));
    await assertFails(updateDoc(doc(db('est'), 'users', 'est'), { studentIds: [SID, SID2] }));
  });
  it('cada docente ajusta su propia carga', async () => {
    await assertSucceeds(updateDoc(doc(db('doc'), 'users', 'doc'), { areas: ['Matemática', 'Ciencia y Tecnología'], aulas: ['1° A'] }));
  });
  it('la dirección asigna áreas a sus docentes, y nada más', async () => {
    await assertSucceeds(updateDoc(doc(db('dir'), 'users', 'doc'), { areas: ['Matemática', 'Educación Física'], levels: ['secundaria'], aulas: [] }));
    await assertFails(updateDoc(doc(db('dir'), 'users', 'doc'), { fullName: 'Otro nombre' }));
    await assertFails(updateDoc(doc(db('dir'), 'users', 'doc'), { role: 'director' }));
    await assertFails(updateDoc(doc(db('dir'), 'users', 'aux'), { areas: ['Matemática'] }));
    await assertFails(updateDoc(doc(db('dir2'), 'users', 'doc'), { areas: ['Arte y Cultura'] }));
    await assertFails(updateDoc(doc(db('aux'), 'users', 'doc'), { areas: ['Arte y Cultura'] }));
  });
  it('la familia no se vincula a otros hijos desde su cuenta de carnet', async () => {
    await assertFails(updateDoc(doc(db('fam'), 'users', 'fam'), { studentIds: arrayUnion(SID2), linkCode: 'FAMILIA2' }));
    await assertFails(updateDoc(doc(db('fam'), 'users', 'fam'), { studentIds: arrayUnion(SID2), linkCode: 'ESTUDIA1' }));
  });
  it('solo la dirección ve el equipo de su colegio', async () => {
    await assertSucceeds(getDocs(query(collection(db('dir'), 'users'), where('institutionId', '==', IID))));
    await assertFails(getDocs(query(collection(db('doc'), 'users'), where('institutionId', '==', IID))));
    await assertFails(getDocs(query(collection(db('dir2'), 'users'), where('institutionId', '==', IID))));
    await assertFails(getDoc(doc(db('doc'), 'users', 'dir')));
  });
  it('la dirección quita accesos, pero no a otra dirección', async () => {
    await assertSucceeds(deleteDoc(doc(db('dir'), 'users', 'doc')));
    await assertFails(deleteDoc(doc(db('dir2'), 'users', 'aux')));
    await assertFails(deleteDoc(doc(db('doc'), 'users', 'aux')));
  });
});

describe('Datos del colegio', () => {
  it('otro colegio no puede leer nada', async () => {
    const d = db('dir2');
    await assertFails(getDoc(doc(d, 'institutions', IID)));
    await assertFails(getDocs(collection(d, 'institutions', IID, 'students')));
    await assertFails(getDocs(collection(d, 'institutions', IID, 'attendance')));
  });
  it('sin sesión no se lee el colegio', async () => {
    await assertFails(getDoc(doc(anon(), 'institutions', IID)));
    await assertFails(getDoc(doc(anon(), 'institutions', IID, 'students', SID)));
  });
  it('solo la dirección cambia la configuración y lee los códigos', async () => {
    await assertSucceeds(updateDoc(doc(db('dir'), 'institutions', IID), { name: 'Nuevo nombre' }));
    await assertFails(updateDoc(doc(db('doc'), 'institutions', IID), { name: 'X' }));
    await assertFails(updateDoc(doc(db('dir'), 'institutions', IID), { ownerUid: 'otro' }));
    await assertSucceeds(getDoc(doc(db('dir'), 'institutions', IID, 'private', 'codes')));
    await assertFails(getDoc(doc(db('doc'), 'institutions', IID, 'private', 'codes')));
  });
  it('solo la dirección matricula y retira estudiantes', async () => {
    await assertSucceeds(setDoc(doc(db('dir'), 'institutions', IID, 'students', 'st_3'), { fullName: 'Nuevo' }));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'students', 'st_4'), { fullName: 'Nuevo' }));
    await assertFails(deleteDoc(doc(db('doc'), 'institutions', IID, 'students', SID)));
    await assertSucceeds(setDoc(doc(db('dir'), 'linkCodes', 'NUEVOES1'), { institutionId: IID, studentId: 'st_3', kind: 'estudiante' }));
    await assertFails(setDoc(doc(db('doc'), 'linkCodes', 'NUEVOES2'), { institutionId: IID, studentId: 'st_3', kind: 'estudiante' }));
    await assertFails(setDoc(doc(db('dir2'), 'linkCodes', 'NUEVOES3'), { institutionId: IID, studentId: SID, kind: 'familia' }));
  });
  it('docentes ponen notas, pero no cambian datos personales', async () => {
    const ref = doc(db('doc'), 'institutions', IID, 'students', SID);
    await assertSucceeds(updateDoc(ref, { grades: [{ courseName: 'Matemática', comp: { '23': ['A'] } }], updatedAt: 'x' }));
    await assertFails(updateDoc(ref, { dni: '11111111' }));
  });
  it('el auxiliar no pone notas', async () => {
    await assertFails(updateDoc(doc(db('aux'), 'institutions', IID, 'students', SID), { grades: [{ courseName: 'Matemática', comp: { '23': ['AD'] } }] }));
    await assertSucceeds(updateDoc(doc(db('aux'), 'institutions', IID, 'students', SID), { presentDays: increment(1), totalDays: increment(1) }));
  });
});

describe('Estudiantes y familias', () => {
  it('ven solo su ficha', async () => {
    await assertSucceeds(getDoc(doc(db('est'), 'institutions', IID, 'students', SID)));
    await assertFails(getDoc(doc(db('est'), 'institutions', IID, 'students', SID2)));
    await assertFails(getDocs(collection(db('fam'), 'institutions', IID, 'students')));
  });
  it('no cambian sus notas', async () => {
    await assertFails(updateDoc(doc(db('est'), 'institutions', IID, 'students', SID), { grades: [{ courseName: 'Matemática', comp: { '23': ['AD'] } }] }));
  });
  it('ven solo su asistencia', async () => {
    const att = collection(db('fam'), 'institutions', IID, 'attendance');
    await assertSucceeds(getDocs(query(att, where('studentId', '==', SID))));
    await assertFails(getDocs(query(att, where('studentId', '==', SID2))));
    await assertFails(getDocs(att));
  });
  it('ven solo su evaluación física', async () => {
    const fx = collection(db('est'), 'institutions', IID, 'fitness');
    await assertSucceeds(getDocs(query(fx, where('studentId', '==', SID))));
    await assertFails(getDocs(fx));
  });
  it('no ven la planificación docente', async () => {
    await assertFails(getDoc(doc(db('est'), 'institutions', IID, 'plans', 'p1')));
  });
  it('responden actividades solo a su nombre', async () => {
    const d = db('est');
    await assertSucceeds(getDocs(query(collection(d, 'institutions', IID, 'tasks'), where('aula', '==', '1° A'))));
    await assertSucceeds(setDoc(doc(d, 'institutions', IID, 'tasks', 't1', 'responses', SID), { studentId: SID, studentName: SID, text: 'Mi respuesta', submittedAt: 'x' }));
    await assertFails(setDoc(doc(d, 'institutions', IID, 'tasks', 't1', 'responses', SID2), { studentId: SID2, studentName: SID2, text: 'Suplanto', submittedAt: 'x' }));
    await assertFails(updateDoc(doc(d, 'institutions', IID, 'tasks', 't1', 'responses', SID), { literal: 'AD' }));
    await assertSucceeds(updateDoc(doc(db('doc'), 'institutions', IID, 'tasks', 't1', 'responses', SID), { literal: 'A', feedback: 'Bien', reviewedAt: 'x', reviewer: 'doc' }));
  });
  it('no publican comunicados ni actividades', async () => {
    await assertFails(setDoc(doc(db('fam'), 'institutions', IID, 'announcements', 'a1'), { authorUid: 'fam', body: 'Hola' }));
    await assertFails(setDoc(doc(db('est'), 'institutions', IID, 'tasks', 't2'), { ownerUid: 'est', title: 'X' }));
  });
});

describe('Asistencia', () => {
  it('el personal registra ingresos con el id día_estudiante', async () => {
    const att = (uid: string, id: string) => setDoc(doc(db(uid), 'institutions', IID, 'attendance', id), { studentId: SID, day: '2026-03-11', status: 'Puntual' });
    await assertSucceeds(att('aux', `2026-03-11_${SID}`));
    await assertFails(att('aux', 'otro-id'));
    // La puerta es de la dirección y el personal de servicio, no de los docentes.
    await assertFails(att('doc', `2026-03-11_${SID2}`));
    await assertFails(att('fam', `2026-03-12_${SID}`));
  });
  it('solo dirección y auxiliar corrigen el estado', async () => {
    const id = `2026-03-10_${SID}`;
    await assertSucceeds(updateDoc(doc(db('aux'), 'institutions', IID, 'attendance', id), { status: 'Justificada', editedBy: 'aux', editedAt: 'x' }));
    await assertFails(updateDoc(doc(db('doc'), 'institutions', IID, 'attendance', id), { status: 'Puntual', editedBy: 'doc', editedAt: 'x' }));
    await assertFails(updateDoc(doc(db('aux'), 'institutions', IID, 'attendance', id), { studentId: SID2 }));
  });
});

describe('Asistencia de clase', () => {
  const rec = (uid: string, extra: Record<string, unknown> = {}) => ({
    ownerUid: uid, ownerName: uid, area: 'Matemática', aula: '1ro Primaria · A', day: '2026-03-11', marks: { [SID]: 'P', [SID2]: 'F' }, updatedAt: 'x', ...extra,
  });
  const ref = (fs: Firestore, id: string) => doc(fs, 'institutions', IID, 'classAttendance', id);
  const ID = 'doc_2026-03-11_matematica_1ro-primaria-a';

  it('cada docente registra la suya, con su id', async () => {
    await assertSucceeds(setDoc(ref(db('doc'), ID), rec('doc')));
    await assertSucceeds(setDoc(ref(db('doc'), ID), rec('doc', { marks: { [SID]: 'T' } })));
    await assertFails(setDoc(ref(db('doc'), 'dir_2026-03-11_x'), rec('doc')));
    await assertFails(setDoc(ref(db('doc'), ID), rec('dir')));
    await assertFails(setDoc(ref(db('doc'), ID), rec('doc', { extra: 1 })));
    await assertFails(setDoc(ref(db('aux'), 'aux_2026-03-11_x'), rec('aux')));
    await assertFails(setDoc(ref(db('est'), 'est_2026-03-11_x'), rec('est')));
  });
  it('la ve su docente y la dirección; nadie más', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(ref(ctx.firestore() as unknown as Firestore, ID), rec('doc')); });
    const list = (fs: Firestore) => getDocs(query(collection(fs, 'institutions', IID, 'classAttendance'), where('ownerUid', '==', 'doc')));
    await assertSucceeds(getDoc(ref(db('doc'), ID)));
    await assertSucceeds(list(db('doc')));
    await assertSucceeds(getDocs(collection(db('dir'), 'institutions', IID, 'classAttendance')));
    await assertFails(getDocs(collection(db('doc'), 'institutions', IID, 'classAttendance')));
    await assertFails(getDoc(ref(db('aux'), ID)));
    await assertFails(getDoc(ref(db('est'), ID)));
    await assertFails(getDoc(ref(db('dir2'), ID)));
    await assertFails(setDoc(ref(db('dir'), ID), rec('dir')));
  });
});

describe('Copia de la asistencia de clase y calificación con rúbrica', () => {
  const marks = (fs: Firestore, sid = SID) => doc(fs, 'institutions', IID, 'classMarks', sid);
  it('cada docente escribe solo su parte y el estudiante ve la suya', async () => {
    await assertSucceeds(setDoc(marks(db('doc')), { byTeacher: { doc: { '2026-03-11_matematica': { d: '2026-03-11', a: 'Matemática', m: 'P' } } } }, { merge: true }));
    await assertSucceeds(setDoc(marks(db('dir')), { byTeacher: { dir: { '2026-03-11_arte': { d: '2026-03-11', a: 'Arte', m: 'F' } } } }, { merge: true }));
    await assertFails(setDoc(marks(db('doc')), { byTeacher: { dir: { x: { d: '2026-03-11', a: 'Arte', m: 'P' } } } }, { merge: true }));
    await assertFails(setDoc(marks(db('aux')), { byTeacher: { aux: {} } }, { merge: true }));
    await assertFails(setDoc(marks(db('est')), { byTeacher: { est: {} } }, { merge: true }));
    await assertSucceeds(getDoc(marks(db('est'))));
    await assertSucceeds(getDoc(marks(db('fam'))));
    await assertFails(getDoc(marks(db('est'), SID2)));
  });
  it('la rúbrica calificada es de su docente; la dirección la ve', async () => {
    const ref = (fs: Firestore) => doc(fs, 'institutions', IID, 'rubricScores', 'pl_1_1ro-primaria-a');
    const data = (owner: string) => ({ ownerUid: owner, planId: 'pl_1', aula: '1ro Primaria · A', links: { 0: 'c23' }, scores: { [SID]: { 0: 4 } }, updatedAt: 'x' });
    await assertSucceeds(setDoc(ref(db('doc')), data('doc')));
    await assertFails(setDoc(ref(db('dir')), data('dir')));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'rubricScores', 'otro'), data('dir')));
    await assertSucceeds(getDoc(ref(db('doc'))));
    await assertSucceeds(getDoc(ref(db('dir'))));
    await assertFails(getDoc(ref(db('est'))));
    await assertFails(getDoc(ref(db('aux'))));
  });
});

describe('Horarios', () => {
  const sched = (uid: string, extra: Record<string, unknown> = {}) => ({
    ownerUid: uid, ownerName: uid, updatedAt: '2026-03-10',
    blocks: [{ id: 'b1', day: 1, start: '08:00', end: '08:45', aula: '1ro Primaria · A', area: 'Matemática' }], ...extra,
  });
  it('cada docente guarda solo su horario', async () => {
    await assertSucceeds(setDoc(doc(db('doc'), 'institutions', IID, 'schedules', 'doc'), sched('doc')));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'schedules', 'dir'), sched('dir')));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'schedules', 'doc'), sched('dir')));
    await assertFails(setDoc(doc(db('aux'), 'institutions', IID, 'schedules', 'aux'), sched('aux')));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'schedules', 'doc'), sched('doc', { extra: true })));
  });
  it('todo el colegio lo ve, otro colegio no', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'institutions', IID, 'schedules', 'doc'), sched('doc'));
    });
    await assertSucceeds(getDocs(collection(db('est'), 'institutions', IID, 'schedules')));
    await assertSucceeds(getDocs(collection(db('dir'), 'institutions', IID, 'schedules')));
    await assertFails(getDocs(collection(db('dir2'), 'institutions', IID, 'schedules')));
    await assertFails(getDocs(collection(anon(), 'institutions', IID, 'schedules')));
  });
  it('estudiantes y familias no lo cambian; la dirección puede borrarlo', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'institutions', IID, 'schedules', 'doc'), sched('doc'));
    });
    await assertFails(setDoc(doc(db('est'), 'institutions', IID, 'schedules', 'est'), sched('est')));
    await assertFails(deleteDoc(doc(db('fam'), 'institutions', IID, 'schedules', 'doc')));
    await assertSucceeds(deleteDoc(doc(db('dir'), 'institutions', IID, 'schedules', 'doc')));
  });
});

describe('Límite diario de la IA', () => {
  const DAY = '2026-03-10';
  // Igual que el servidor: sube el contador de uno en uno.
  const use = (uid: string, owner = uid, day = DAY) =>
    setDoc(doc(db(uid), 'institutions', IID, 'aiUsage', `${owner}_${day}`), { uid: owner, day, count: increment(1) }, { merge: true });
  it('cada docente suma su propio uso, de uno en uno', async () => {
    await assertSucceeds(use('doc'));
    await assertSucceeds(use('doc'));
    await assertSucceeds(use('dir'));
    await assertFails(use('doc', 'dir'));
    await assertFails(use('aux'));
    await assertFails(use('est'));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'aiUsage', `doc_${DAY}`), { uid: 'doc', day: DAY, count: 5 }, { merge: true }));
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'aiUsage', `doc_2026-03-11`), { uid: 'doc', day: '2026-03-11', count: 0 }));
  });
  it('no pasa de 25 por día y nadie lo borra', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'institutions', IID, 'aiUsage', `doc_${DAY}`), { uid: 'doc', day: DAY, count: 25 });
    });
    await assertFails(use('doc'));
    await assertSucceeds(use('doc', 'doc', '2026-03-11'));
    await assertFails(deleteDoc(doc(db('doc'), 'institutions', IID, 'aiUsage', `doc_${DAY}`)));
    await assertFails(deleteDoc(doc(db('dir'), 'institutions', IID, 'aiUsage', `doc_${DAY}`)));
    await assertSucceeds(getDoc(doc(db('dir'), 'institutions', IID, 'aiUsage', `doc_${DAY}`)));
    await assertFails(getDoc(doc(db('aux'), 'institutions', IID, 'aiUsage', `doc_${DAY}`)));
  });
});

describe('Planificación, actividades y evaluación física', () => {
  it('cada docente ve su planificación y la dirección ve todas', async () => {
    await assertSucceeds(getDocs(query(collection(db('doc'), 'institutions', IID, 'plans'), where('ownerUid', '==', 'doc'))));
    await assertSucceeds(getDocs(collection(db('dir'), 'institutions', IID, 'plans')));
    await assertFails(getDocs(collection(db('doc'), 'institutions', IID, 'plans')));
    await assertFails(getDocs(collection(db('aux'), 'institutions', IID, 'plans')));
  });
  it('la dirección visa, pero no se apropia de la planificación', async () => {
    const ref = doc(db('dir'), 'institutions', IID, 'plans', 'p1');
    await assertSucceeds(setDoc(ref, { ownerUid: 'doc', title: 'Unidad 1', status: 'visado' }));
    await assertFails(setDoc(ref, { ownerUid: 'dir', title: 'Unidad 1' }));
  });
  it('un docente no crea planes a nombre de otro', async () => {
    await assertFails(setDoc(doc(db('doc'), 'institutions', IID, 'plans', 'p2'), { ownerUid: 'dir', title: 'X' }));
    await assertFails(setDoc(doc(db('aux'), 'institutions', IID, 'plans', 'p3'), { ownerUid: 'aux', title: 'X' }));
  });
  it('evaluación física: docentes registran, el auxiliar no', async () => {
    await assertSucceeds(setDoc(doc(db('doc'), 'institutions', IID, 'fitness', 'f3'), { ownerUid: 'doc', studentId: SID, imc: 17 }));
    await assertFails(setDoc(doc(db('aux'), 'institutions', IID, 'fitness', 'f4'), { ownerUid: 'aux', studentId: SID, imc: 17 }));
  });
});

describe('Ingreso con carnet QR y PIN', () => {
  const carnetUser = async (uid: string, role: 'estudiante' | 'familia', token: string) => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users', uid), {
        uid, email: `${uid}@prueba.test`, fullName: uid, role, institutionId: IID, studentIds: [SID], carnetToken: token,
      });
    });
  };
  const TOK = `tok_${SID}`;
  // Activación: carnets + carnetPins en un lote, como hace la app.
  const activate = (fs: Firestore, who: 'estudiante' | 'familia', code: string, pin: string, token = TOK, sid = SID) => {
    const b = writeBatch(fs);
    b.set(doc(fs, 'carnets', `${token}_${who}`), { institutionId: IID, studentId: sid, role: who, createdAt: '2026-03-10' });
    b.set(doc(fs, 'carnetPins', `${token}_${who}`), { pinHash: sha(proof(token, who, pin)), linkCode: code });
    return b.commit();
  };
  const carnetProfile = (uid: string, who: 'estudiante' | 'familia', pin: string, extra: Record<string, unknown> = {}) => ({
    uid, email: '', fullName: who === 'estudiante' ? 'Estudiante' : 'Familia', role: who, institutionId: IID,
    studentIds: [SID], carnetToken: TOK, pinProof: proof(TOK, who, pin), createdAt: '2026-03-10', ...extra,
  });

  it('se activa con el código de la ficha y entra con su PIN', async () => {
    await assertSucceeds(activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456'));
    await assertSucceeds(setDoc(doc(anonUser('a1'), 'users', 'a1'), carnetProfile('a1', 'estudiante', '123456')));
    await assertSucceeds(activate(anonUser('a2'), 'familia', 'FAMILIA1', '654321'));
    await assertSucceeds(setDoc(doc(anonUser('a2'), 'users', 'a2'), carnetProfile('a2', 'familia', '654321')));
    await assertSucceeds(getDoc(doc(anonUser('a1'), 'institutions', IID, 'students', SID)));
  });
  it('con un PIN equivocado no entra', async () => {
    await activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456');
    await assertFails(setDoc(doc(anonUser('a3'), 'users', 'a3'), carnetProfile('a3', 'estudiante', '000000')));
    // El PIN del estudiante no abre la cuenta de familia.
    await assertFails(setDoc(doc(anonUser('a3'), 'users', 'a3'), carnetProfile('a3', 'familia', '123456')));
  });
  it('un carnet se activa una sola vez y nadie lee el PIN', async () => {
    await activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456');
    await assertFails(activate(anonUser('a4'), 'estudiante', 'ESTUDIA1', '999999'));
    await assertFails(getDoc(doc(anonUser('a4'), 'carnetPins', `${TOK}_estudiante`)));
    await assertSucceeds(getDoc(doc(anonUser('a4'), 'carnets', `${TOK}_estudiante`)));
    await assertFails(getDocs(collection(anonUser('a4'), 'carnets')));
  });
  it('no se activa con un código o un carnet que no corresponden', async () => {
    await assertFails(activate(anonUser('a1'), 'estudiante', 'FAMILIA1', '123456'));
    await assertFails(activate(anonUser('a1'), 'familia', 'FAMILIA2', '123456'));
    await assertFails(activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456', `tok_${SID2}`));
    await assertFails(activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456', 'inventado'));
    await assertFails(activate(anon(), 'estudiante', 'ESTUDIA1', '123456'));
  });
  it('el perfil de carnet no se arma con correo ni con otra ficha', async () => {
    await activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456');
    // Con una cuenta de correo, aunque el PIN sea correcto.
    await assertFails(setDoc(doc(db('a5', ''), 'users', 'a5'), carnetProfile('a5', 'estudiante', '123456')));
    await assertFails(setDoc(doc(anonUser('a5'), 'users', 'a5'), carnetProfile('a5', 'estudiante', '123456', { studentIds: [SID, SID2] })));
    await assertFails(setDoc(doc(anonUser('a5'), 'users', 'a5'), carnetProfile('a5', 'estudiante', '123456', { role: 'director' })));
    await assertFails(setDoc(doc(anonUser('a5'), 'users', 'a5'), carnetProfile('a5', 'estudiante', '123456', { institutionId: OTHER })));
  });
  it('con un QR nuevo el carnet anterior ya no abre sesión', async () => {
    await activate(anonUser('a1'), 'estudiante', 'ESTUDIA1', '123456');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore() as unknown as Firestore, 'institutions', IID, 'students', SID), { qrToken: 'tok_nuevo' });
    });
    await assertFails(setDoc(doc(anonUser('a6'), 'users', 'a6'), carnetProfile('a6', 'estudiante', '123456')));
  });
  it('ve su ficha, su asistencia y sus actividades mientras el carnet siga vigente', async () => {
    await carnetUser('qe', 'estudiante', `tok_${SID}`);
    await assertSucceeds(getDoc(doc(db('qe'), 'institutions', IID, 'students', SID)));
    await assertSucceeds(getDocs(query(collection(db('qe'), 'institutions', IID, 'attendance'), where('studentId', '==', SID))));
    await assertSucceeds(setDoc(doc(db('qe'), 'institutions', IID, 'tasks', 't1', 'responses', SID), { studentId: SID, studentName: 'Uno', text: 'Listo', submittedAt: '2026-03-10' }));
  });
  it('un QR nuevo deja sin acceso a las cuentas del carnet anterior', async () => {
    await carnetUser('qe', 'estudiante', `tok_${SID}`);
    await carnetUser('qf', 'familia', `tok_${SID}`);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore() as unknown as Firestore, 'institutions', IID, 'students', SID), { qrToken: 'tok_nuevo' });
    });
    await assertFails(getDoc(doc(db('qe'), 'institutions', IID, 'students', SID)));
    await assertFails(getDocs(query(collection(db('qf'), 'institutions', IID, 'attendance'), where('studentId', '==', SID))));
    await assertFails(setDoc(doc(db('qe'), 'institutions', IID, 'tasks', 't1', 'responses', SID), { studentId: SID, studentName: 'Uno', text: 'Listo', submittedAt: '2026-03-10' }));
  });
  it('un perfil de estudiante sin carnet no ve nada', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users', 'viejo'), { uid: 'viejo', email: 'viejo@prueba.test', fullName: 'viejo', role: 'estudiante', institutionId: IID, studentIds: [SID] });
    });
    await assertFails(getDoc(doc(db('viejo'), 'institutions', IID, 'students', SID)));
  });
  it('una cuenta de carnet no vincula otros hijos ni se quita el carnet', async () => {
    await carnetUser('qf', 'familia', `tok_${SID}`);
    await assertFails(updateDoc(doc(db('qf'), 'users', 'qf'), { studentIds: arrayUnion(SID2), linkCode: 'FAMILIA2' }));
    await assertFails(updateDoc(doc(db('qf'), 'users', 'qf'), { carnetToken: 'tok_nuevo' }));
  });
});

describe('Portal del carnet sin cuenta', () => {
  it('cualquiera con el token lo abre, pero nadie lo lista', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'portals', `tok_${SID}`)));
    await assertFails(getDocs(collection(anon(), 'portals')));
    await assertSucceeds(getDoc(doc(anon(), 'boards', IID)));
  });
  it('sin sesión nadie lo modifica', async () => {
    await assertFails(setDoc(doc(anon(), 'portals', `tok_${SID}`), { institutionId: IID, fullName: 'X' }));
    await assertFails(setDoc(doc(anon(), 'boards', IID), { institutionId: IID, announcements: [] }));
  });
  it('otro colegio no sobrescribe el portal', async () => {
    await assertFails(setDoc(doc(db('dir2'), 'portals', `tok_${SID}`), { institutionId: OTHER, fullName: 'X' }));
  });
  it('el personal actualiza la asistencia del portal', async () => {
    await assertSucceeds(setDoc(doc(db('aux'), 'portals', `tok_${SID}`), { institutionId: IID, att: { '2026-03-11': { t: '07:40', s: 'Puntual' } } }, { merge: true }));
  });
});

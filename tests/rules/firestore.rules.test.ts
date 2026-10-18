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
    await user('est', { role: 'estudiante', institutionId: IID, studentIds: [SID] });
    await user('fam', { role: 'familia', institutionId: IID, studentIds: [SID] });
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
  it('estudiante con su código queda vinculado solo a su ficha', async () => {
    await assertSucceeds(setDoc(doc(db('ne'), 'users', 'ne'), profile('ne', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID] })));
  });
  it('estudiante no puede vincularse a otra ficha con su código', async () => {
    await assertFails(setDoc(doc(db('ne'), 'users', 'ne'), profile('ne', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID, SID2] })));
  });
  it('el código de estudiante no crea una cuenta de familia', async () => {
    await assertFails(setDoc(doc(db('nf'), 'users', 'nf'), profile('nf', { role: 'familia', linkCode: 'ESTUDIA1', studentIds: [SID] })));
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
  it('la familia vincula a otro hijo con su código de familia', async () => {
    await assertSucceeds(updateDoc(doc(db('fam'), 'users', 'fam'), { studentIds: arrayUnion(SID2), linkCode: 'FAMILIA2' }));
  });
  it('la familia no vincula hijos sin el código correcto', async () => {
    await assertFails(updateDoc(doc(db('fam'), 'users', 'fam'), { studentIds: arrayUnion(SID2), linkCode: 'FAMILIA1' }));
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
    await assertFails(att('fam', `2026-03-12_${SID}`));
  });
  it('solo dirección y auxiliar corrigen el estado', async () => {
    const id = `2026-03-10_${SID}`;
    await assertSucceeds(updateDoc(doc(db('aux'), 'institutions', IID, 'attendance', id), { status: 'Justificada', editedBy: 'aux', editedAt: 'x' }));
    await assertFails(updateDoc(doc(db('doc'), 'institutions', IID, 'attendance', id), { status: 'Puntual', editedBy: 'doc', editedAt: 'x' }));
    await assertFails(updateDoc(doc(db('aux'), 'institutions', IID, 'attendance', id), { studentId: SID2 }));
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
  const profile = (uid: string, extra: Record<string, unknown>) => ({ uid, email: `${uid}@prueba.test`, fullName: 'Persona Nueva', institutionId: IID, ...extra });

  it('se activa con el código de la ficha y el token del carnet vigente', async () => {
    await assertSucceeds(setDoc(doc(db('qe'), 'users', 'qe'), profile('qe', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID], carnetToken: `tok_${SID}` })));
    await assertSucceeds(setDoc(doc(db('qf'), 'users', 'qf'), profile('qf', { role: 'familia', linkCode: 'FAMILIA1', studentIds: [SID], carnetToken: `tok_${SID}` })));
  });
  it('no se activa con el carnet de otro estudiante', async () => {
    await assertFails(setDoc(doc(db('qe'), 'users', 'qe'), profile('qe', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID], carnetToken: `tok_${SID2}` })));
    await assertFails(setDoc(doc(db('qe'), 'users', 'qe'), profile('qe', { role: 'estudiante', linkCode: 'ESTUDIA1', studentIds: [SID], carnetToken: 'inventado' })));
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
    // Las cuentas con correo no dependen del carnet.
    await assertSucceeds(getDoc(doc(db('est'), 'institutions', IID, 'students', SID)));
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

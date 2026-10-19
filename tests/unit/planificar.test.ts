import { describe, expect, it } from 'vitest';
import { Packer } from 'docx';
import { competenciasOf } from '../../src/lib/cneb';
import { withDetalle } from '../../src/lib/planAi';
import { longDate, minutesOf, normalizeSesion, normalizeUnidad } from '../../src/lib/planDoc';
import { buildWord } from '../../src/lib/planWord';
import type { Plan } from '../../src/lib/store';
import { buildPrompt, handlePlanRequest, parseJson, toResponse, validate } from '../../server/planificar';

const EF = competenciasOf('Educación Física', 'secundaria');
const ask = { kind: 'unidad', area: 'Educación Física', level: 'secundaria', grade: '3ro Secundaria', tema: 'Gimnasia: control corporal', duracion: '4 semanas', numero: 4, sesiones: 6 };

const unidadIA = {
  titulo: '"Gimnasia: control corporal, equilibrio y expresión"',
  situacion: 'Los estudiantes de 3.º grado…\nFrente a esta realidad…',
  reto: '¿Cómo podemos mejorar nuestro control corporal?',
  proposito: [{ competencia: EF[0].name.toUpperCase(), capacidades: ['Comprende su cuerpo.', ''], desempenos: '1.1 Realiza movimientos.\n1.2 Crea secuencias.', estandar: 'Se desenvuelve…', criterios: ['• Realiza volteos con control.'] }],
  transversales: [{ competencia: 'Gestiona su aprendizaje de manera autónoma', capacidad: 'Monitorea y ajusta su desempeño', descripcion: 'Registran su progreso.' }],
  enfoques: [{ enfoque: 'Enfoque de derechos', valor: 'Conciencia de derechos', actitudes: '• Todos participan.' }],
  sesiones: [{ titulo: 'Conociendo la gimnasia', competencias: [EF[0].name], desempenos: ['1.1'], proposito: 'Explorar movimientos.', instrumentos: ['Lista de cotejo de participación'] }],
  evaluacion: [{ competencia: EF[0].name, tecnica: 'Observación', instrumentos: ['Rúbrica'], desempenos: ['1.1'], sesiones: 'Sesiones 1 y 2' }],
  bibliografia: ['Ministerio de Educación del Perú. (2016). Currículo Nacional de la Educación Básica. Lima: MINEDU.'],
};

const plan = (kind: Plan['kind']): Plan => ({
  id: '', kind, ownerUid: 'doc', ownerName: 'Docente', area: 'Educación Física', level: 'secundaria', grade: '3ro Secundaria', section: '', title: 'X', period: 'I Bimestre',
  date: '2026-10-12', duration: '70 minutos', situacion: '', proposito: '', competencias: [], capacidades: [], desempenos: '', criterios: '', evidencia: '',
  instrumento: 'Lista de cotejo', enfoques: [], inicio: '', desarrollo: '', cierre: '', materiales: '', status: 'Borrador', observacion: '', updatedAt: '',
});

describe('documento de planificación', () => {
  it('ordena lo que llega de la IA: listas, viñetas y filas vacías', () => {
    const u = normalizeUnidad(unidadIA, 4);
    expect(u.numero).toBe(4);
    expect(u.proposito[0].capacidades).toEqual(['Comprende su cuerpo.']);
    expect(u.proposito[0].desempenos).toEqual(['1.1 Realiza movimientos.', '1.2 Crea secuencias.']);
    expect(u.proposito[0].criterios).toEqual(['Realiza volteos con control.']);
    const s = normalizeSesion({}, 1, 4, 70);
    expect(s.inicio.minutos + s.desarrollo.minutos + s.cierre.minutos).toBe(70);
    expect(minutesOf('70 min')).toBe(70);
    expect(minutesOf('1 h 30')).toBe(90);
    expect(longDate('2026-10-12')).toBe('12 de octubre del 2026');
  });

  it('los campos de la lista y la lista de cotejo salen del documento', () => {
    const p = withDetalle(plan('unidad'), normalizeUnidad(unidadIA, 4));
    expect(p.competencias).toEqual([EF[0].id]);
    expect(p.criterios).toBe('Realiza volteos con control.');
    expect(p.enfoques).toEqual(['Enfoque de derechos']);
    expect(p.instrumento).toBe('Lista de cotejo');
    expect(p.situacion).toMatch(/Reto: ¿Cómo/);
  });

  it('arma el Word con las secciones del formato del docente', async () => {
    const info = { titulo: 'Gimnasia', institucion: 'Mi colegio', ugel: 'Melgar', area: 'Educación Física', nivel: 'Secundaria', grado: '3ro', docente: 'Docente', duracion: '4 semanas', fecha: '2026-10-12', lugarFecha: '12 de octubre del 2026' };
    const buf = await Packer.toBuffer(buildWord(normalizeUnidad(unidadIA, 4), info));
    expect(buf.length).toBeGreaterThan(5000);
    const ses = await Packer.toBuffer(buildWord(normalizeSesion({ proposito: unidadIA.proposito, rubrica: [{ criterio: 'Realiza volteos' }] }, 1, 4, 70), info));
    expect(ses.length).toBeGreaterThan(5000);
  });
});

describe('servidor de planificación', () => {
  it('valida lo que pide el docente', () => {
    expect(validate(ask).sesiones).toBe(6);
    expect(() => validate({ ...ask, area: 'Astrología' })).toThrow(/CNEB/);
    expect(() => validate({ ...ask, tema: '' })).toThrow(/tema/);
    expect(() => validate({ ...ask, tema: 'x'.repeat(301) })).toThrow(/largo/);
    expect(validate({ ...ask, sesiones: 99 }).sesiones).toBe(12);
  });

  it('el pedido lleva el tema y las competencias del área, sin datos de estudiantes', () => {
    const { system, user } = buildPrompt(validate({ ...ask, notas: 'Les cuesta el equilibrio' }));
    expect(system).toMatch(/JSON/);
    expect(user).toContain('Gimnasia: control corporal');
    expect(user).toContain(EF[0].name.toUpperCase());
    expect(user).toContain('UNIDAD DE APRENDIZAJE N° 4');
    expect(user).toContain('Les cuesta el equilibrio');
  });

  it('lee el JSON aunque venga entre bloques de código', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => parseJson('lo siento')).toThrow();
    const r = toResponse(validate(ask), unidadIA, 'Gemini');
    expect(r.titulo).toBe('Gimnasia: control corporal, equilibrio y expresión');
    expect(() => toResponse(validate(ask), { titulo: 'x' }, 'Gemini')).toThrow(/incompleta/);
  });

  const token = `x.${Buffer.from(JSON.stringify({ user_id: 'doc' })).toString('base64url')}.y`;
  const call = (body: unknown, routes: (url: string, init?: RequestInit) => Response, env: Record<string, string> = { GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g', VITE_FIREBASE_PROJECT_ID: 'p' }) =>
    handlePlanRequest(new Request('http://x/api/planificar', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }), env, (async (u: string, i?: RequestInit) => routes(String(u), i)) as typeof fetch);
  const profile = (role: string) => Response.json({ fields: { role: { stringValue: role }, institutionId: { stringValue: 'in_1' } } });

  it('usa Gemini y, si falla, Groq', async () => {
    const used: string[] = [];
    const res = await call(ask, (u) => {
      if (u.includes('/users/doc')) return profile('docente');
      if (u.endsWith(':commit')) return Response.json({});
      if (u.includes('generativelanguage')) { used.push('gemini'); return new Response('', { status: 503 }); }
      used.push('groq');
      return Response.json({ choices: [{ message: { content: JSON.stringify(unidadIA) } }] });
    });
    expect(res.status).toBe(200);
    expect(used).toEqual(['gemini', 'groq']);
    expect((await res.json()).proveedor).toBe('Groq');
  });

  it('si las dos fallan, dice por qué', async () => {
    const res = await call(ask, (u) => {
      if (u.includes('/users/doc')) return profile('docente');
      if (u.endsWith(':commit')) return Response.json({});
      if (u.includes('generativelanguage')) return Response.json({ error: { message: 'API key not valid.' } }, { status: 400 });
      return Response.json({ error: { message: 'Rate limit reached' } }, { status: 429 });
    });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Gemini: HTTP 400: API key not valid\. · Groq: HTTP 429: Rate limit reached/);
  });

  it('solo docentes y dirección, y con límite diario', async () => {
    const est = await call(ask, (u) => (u.includes('/users/') ? profile('estudiante') : Response.json({})));
    expect(est.status).toBe(403);
    const limit = await call(ask, (u) => (u.includes('/users/') ? profile('docente') : new Response('', { status: 403 })));
    expect(limit.status).toBe(429);
    const sinClave = await call(ask, () => Response.json({}), { VITE_FIREBASE_PROJECT_ID: 'p' });
    expect(sinClave.status).toBe(503);
  });
});

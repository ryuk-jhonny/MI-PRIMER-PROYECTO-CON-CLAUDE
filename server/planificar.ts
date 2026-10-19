// Genera unidades y sesiones de aprendizaje con IA (Gemini y, de respaldo, Groq).
// Corre en Vercel (api/planificar.ts) y en `npm run dev` (plugin de vite.config.ts).
//
// Seguridad:
// - Solo docentes y dirección: el servidor lee el perfil de quien llama con su propio token,
//   así Firestore comprueba que el token es válido y las reglas que es su perfil.
// - Límite diario por docente: un contador en Firestore que las reglas solo dejan subir de uno en uno.
// - Las claves de IA viven en las variables de entorno de Vercel, nunca en la página.
// - A la IA solo se le envía el área, el grado, el tema, la duración y las notas del docente.

import { ALL_AREAS, cicloOf, COMPETENCIAS, competenciasOf, ENFOQUES_TRANSVERSALES, gradeNumber, type Level, LEVEL_LABEL, TRANSVERSALES } from '../src/lib/cneb.js';
import { normalizeSesion, normalizeUnidad, type PropositoFila, type SesionDoc, type SesionFila, type UnidadDoc } from '../src/lib/planDoc.js';

export interface PlanEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  /** Solo pruebas con emuladores: responde un documento de ejemplo sin llamar a la IA. */
  AI_FAKE?: string;
}

export interface PlanRequest {
  kind: 'unidad' | 'sesion';
  area: string;
  level: Level;
  grade: string;
  tema: string;
  duracion: string;
  numero: number;
  sesiones?: number;
  notas?: string;
  /** Para una sesión que sale de una unidad ya generada. */
  unidad?: { titulo: string; situacion: string; reto: string; numero: number; proposito: PropositoFila[]; sesion: SesionFila; sesionNumero: number };
}

export interface PlanResponse {
  titulo: string;
  doc: UnidadDoc | SesionDoc;
  proveedor: string;
}

/** Generaciones por docente y por día. Debe coincidir con la regla de aiUsage en firestore.rules. */
export const DAILY_LIMIT = 25;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, error: string) => json(status, { error });

type Fetch = typeof fetch;

export async function handlePlanRequest(request: Request, env: PlanEnv, fetchImpl: Fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'Usa POST.');

  const project = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
  if (!project) return fail(503, 'Falta la variable VITE_FIREBASE_PROJECT_ID en el servidor.');
  const fake = env.AI_FAKE === '1' && !!env.FIRESTORE_EMULATOR_HOST;
  if (!fake && !env.GEMINI_API_KEY && !env.GROQ_API_KEY) {
    return fail(503, 'La IA todavía no está configurada. Falta poner GEMINI_API_KEY o GROQ_API_KEY en las variables de Vercel.');
  }

  // ----- Quién llama -----
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const uid = uidOf(token);
  if (!uid) return fail(401, 'Vuelve a iniciar sesión.');
  const base = env.FIRESTORE_EMULATOR_HOST ? `http://${env.FIRESTORE_EMULATOR_HOST}/v1` : 'https://firestore.googleapis.com/v1';
  const root = `projects/${project}/databases/(default)/documents`;
  const auth = { authorization: `Bearer ${token}` };

  const me = await fetchImpl(`${base}/${root}/users/${uid}`, { headers: auth });
  if (me.status === 401 || me.status === 403) return fail(401, 'Vuelve a iniciar sesión.');
  if (!me.ok) return fail(502, 'No pudimos leer tu perfil. Inténtalo otra vez.');
  const fields = ((await me.json()) as { fields?: Record<string, { stringValue?: string }> }).fields || {};
  const role = fields.role?.stringValue;
  const iid = fields.institutionId?.stringValue;
  if (!iid || (role !== 'docente' && role !== 'director')) return fail(403, 'Solo docentes y dirección pueden generar planificaciones.');

  // ----- Qué pide -----
  let req: PlanRequest;
  try { req = validate(await request.json()); } catch (err) { return fail(400, err instanceof Error ? err.message : 'Datos inválidos.'); }

  // ----- Límite diario -----
  const day = limaDay();
  const usage = await fetchImpl(`${base}/${root}:commit`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({
      writes: [{
        update: { name: `${root}/institutions/${iid}/aiUsage/${uid}_${day}`, fields: { uid: { stringValue: uid }, day: { stringValue: day } } },
        updateMask: { fieldPaths: ['uid', 'day'] },
        updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
      }],
    }),
  });
  if (usage.status === 403) return fail(429, `Llegaste al límite de ${DAILY_LIMIT} generaciones por hoy. Mañana puedes seguir.`);
  if (!usage.ok) return fail(502, 'No pudimos registrar el uso de la IA. Inténtalo otra vez.');

  // ----- Generar -----
  if (fake) return json(200, fakeResponse(req));
  const { system, user } = buildPrompt(req);
  const errors: string[] = [];
  for (const p of providers(env)) {
    try {
      const text = await p.call(system, user, fetchImpl);
      const parsed = parseJson(text);
      return json(200, toResponse(req, parsed, p.name));
    } catch (err) {
      errors.push(`${p.name}: ${reason(err)}`);
    }
  }
  console.error('planificar: todos los proveedores fallaron', errors);
  return fail(502, `La IA no respondió esta vez. Espera un momento y vuelve a intentar. (Detalle: ${errors.join(' · ')})`);
}

// ---------------------------------------------------------------------

function uidOf(token: string): string {
  const part = token.split('.')[1];
  if (!part) return '';
  try {
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { user_id?: string; sub?: string };
    const uid = payload.user_id || payload.sub || '';
    return /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : '';
  } catch { return ''; }
}

function limaDay(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

const text = (v: unknown, max: number, name: string, required = true): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new Error(`Falta ${name}.`);
  if (s.length > max) throw new Error(`${name[0].toUpperCase()}${name.slice(1)} es demasiado largo.`);
  return s;
};

export function validate(raw: unknown): PlanRequest {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = o.kind === 'unidad' || o.kind === 'sesion' ? o.kind : null;
  if (!kind) throw new Error('Elige unidad o sesión.');
  const area = text(o.area, 80, 'el área');
  if (!ALL_AREAS.includes(area)) throw new Error('Esa área no es del CNEB.');
  const level = o.level === 'primaria' || o.level === 'secundaria' ? o.level : null;
  if (!level || !competenciasOf(area, level).length) throw new Error('Elige un nivel válido para el área.');
  const n = (v: unknown, min: number, max: number, def: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def; };
  const req: PlanRequest = {
    kind, area, level,
    grade: text(o.grade, 60, 'el grado'),
    tema: text(o.tema, 300, 'el tema'),
    duracion: text(o.duracion, 40, 'la duración'),
    numero: n(o.numero, 1, 20, 1),
    sesiones: kind === 'unidad' ? n(o.sesiones, 2, 12, 6) : undefined,
    notas: text(o.notas, 1500, 'las notas', false),
  };
  if (kind === 'sesion' && o.unidad && typeof o.unidad === 'object') {
    const u = o.unidad as Record<string, unknown>;
    const unidad = normalizeUnidad({ situacion: u.situacion, reto: u.reto, proposito: u.proposito, sesiones: [u.sesion] });
    req.unidad = {
      titulo: text(u.titulo, 300, 'el título de la unidad', false),
      situacion: unidad.situacion.slice(0, 3000), reto: unidad.reto, numero: n(u.numero, 1, 20, 1),
      proposito: unidad.proposito, sesion: unidad.sesiones[0] || { titulo: req.tema, competencias: [], desempenos: [], proposito: '', instrumentos: [] },
      sesionNumero: n(u.sesionNumero, 1, 16, 1),
    };
  }
  return req;
}

// ----- Instrucciones para la IA -----

export function buildPrompt(req: PlanRequest): { system: string; user: string } {
  const ciclo = cicloOf(gradeNumber(req.grade), req.level);
  const comps = competenciasOf(req.area, req.level);
  const compText = comps.map((c) => `- ${c.name.toUpperCase()}\n  Capacidades: ${c.capacidades.join('; ')}`).join('\n');
  const transText = TRANSVERSALES.map((n) => COMPETENCIAS[n]).map((c) => `- ${c.name.toUpperCase()} (capacidades: ${c.capacidades.join('; ')})`).join('\n');

  const system = [
    'Eres especialista en planificación curricular del Currículo Nacional de la Educación Básica (CNEB) del Perú.',
    'Escribes en español del Perú, con lenguaje claro para docentes de aula.',
    'Respondes SOLO con un objeto JSON válido, sin texto antes ni después y sin bloques de código.',
    'Reglas de calidad:',
    '- Todo debe ser coherente con el tema: actividades, materiales, ejemplos y bibliografía del mismo tema. No mezcles otros deportes, cursos ni temas.',
    '- Usa los nombres exactos de las competencias y capacidades del CNEB que te doy.',
    '- Los desempeños se numeran por competencia (1.1, 1.2, 2.1…) y se precisan al grado y al tema.',
    '- Los criterios de evaluación son observables y empiezan con un verbo en tercera persona.',
    '- Los estándares describen el nivel esperado del ciclo para esa competencia, aplicado al tema.',
    '- La bibliografía cita solo documentos reales (por ejemplo, el CNEB 2016 y el Programa Curricular del nivel del MINEDU); no inventes enlaces.',
    '- No escribas nombres de estudiantes ni datos personales.',
  ].join('\n');

  const contexto = [
    `Área: ${req.area}`,
    `Nivel: ${LEVEL_LABEL[req.level]} · Grado: ${req.grade} · Ciclo ${ciclo}`,
    `Tema: ${req.tema}`,
    `Duración: ${req.duracion}`,
    req.notas ? `Notas del docente sobre su grupo: ${req.notas}` : '',
    '',
    `Competencias del área en ${LEVEL_LABEL[req.level]}:`,
    compText,
    '',
    'Competencias transversales:',
    transText,
    '',
    `Enfoques transversales: ${ENFOQUES_TRANSVERSALES.join('; ')}`,
  ].filter((l) => l !== '').join('\n');

  if (req.kind === 'unidad') {
    const user = `${contexto}

Elabora la UNIDAD DE APRENDIZAJE N° ${req.numero} con ${req.sesiones} sesiones. Elige las competencias del área que mejor se trabajan con el tema (2 o 3).
Devuelve este JSON:
{
  "titulo": "título motivador de la unidad, sin comillas",
  "situacion": "situación significativa en 3 o 4 párrafos: lo que ya saben, las dificultades que muestran, la necesidad y el reto",
  "reto": "pregunta retadora que moviliza las competencias",
  "proposito": [{ "competencia": "NOMBRE DE LA COMPETENCIA", "capacidades": ["..."], "desempenos": ["1.1 ...", "1.2 ..."], "estandar": "...", "criterios": ["..."] }],
  "transversales": [{ "competencia": "...", "capacidad": "...", "descripcion": "cómo se trabaja en esta unidad" }],
  "enfoques": [{ "enfoque": "Enfoque ...", "valor": "...", "actitudes": "acciones observables en esta unidad" }],
  "sesiones": [{ "titulo": "...", "competencias": ["..."], "desempenos": ["1.1 ..."], "proposito": "...", "instrumentos": ["Rúbrica de ...", "Lista de cotejo de ..."] }],
  "evaluacion": [{ "competencia": "...", "tecnica": "...", "instrumentos": ["..."], "desempenos": ["..."], "sesiones": "Sesiones 1, 2 y 3" }],
  "bibliografia": ["Ministerio de Educación del Perú. (2016). Currículo Nacional de la Educación Básica. Lima: MINEDU.", "..."]
}
Incluye las 2 competencias transversales, 3 enfoques transversales y exactamente ${req.sesiones} sesiones.`;
    return { system, user };
  }

  const u = req.unidad;
  const deUnidad = u ? `
Esta sesión es la N° ${u.sesionNumero} de la unidad N° ${u.numero} "${u.titulo}".
Situación de la unidad: ${u.situacion}
Reto de la unidad: ${u.reto}
Sesión según la unidad: título "${u.sesion.titulo}"; competencias: ${u.sesion.competencias.join('; ')}; desempeños: ${u.sesion.desempenos.join('; ')}; propósito: ${u.sesion.proposito}; instrumentos: ${u.sesion.instrumentos.join('; ')}.
Propósitos de la unidad (usa los mismos nombres y desempeños):
${u.proposito.map((p) => `- ${p.competencia}: ${p.desempenos.join(' | ')} · criterios: ${p.criterios.join(' | ')}`).join('\n')}
` : '';
  const user = `${contexto}
${deUnidad}
Elabora la SESIÓN DE APRENDIZAJE${u ? ` N° ${u.sesionNumero}` : ''}. Duración total: ${req.duracion}; los minutos de inicio, desarrollo y cierre deben sumar esa duración.
Devuelve este JSON:
{
  "titulo": "título de la sesión, sin comillas",
  "proposito": [{ "competencia": "NOMBRE DE LA COMPETENCIA", "capacidades": ["..."], "desempenos": ["1.1 ..."], "criterios": ["..."] }],
  "propositoTexto": "propósito de la sesión en una o dos oraciones",
  "evidencia": "evidencia de aprendizaje observable",
  "transversal": { "competencia": "GESTIONA SU APRENDIZAJE DE MANERA AUTÓNOMA", "capacidades": ["..."] },
  "enfoques": [{ "enfoque": "Enfoque ...", "accion": "qué se observa en esta sesión" }],
  "inicio": { "actividades": "actividades con viñetas (•) y minutos de cada una", "minutos": 15, "materiales": ["..."] },
  "desarrollo": { "actividades": "actividades numeradas con nombre, minutos, explicación del docente, organización y variantes", "minutos": 45, "materiales": ["..."] },
  "cierre": { "actividades": "reflexión con preguntas metacognitivas, vuelta a la calma si corresponde y tarea o compromiso", "minutos": 10, "materiales": ["..."] },
  "rubrica": [{ "criterio": "...", "destacado": "Logro destacado (4)", "esperado": "Logro esperado (3)", "proceso": "En proceso (2)", "inicio": "En inicio (1)" }]
}
Incluye una fila de rúbrica por cada criterio de evaluación y 2 enfoques transversales.`;
  return { system, user };
}

// ----- Proveedores -----

// Una unidad completa es un JSON largo: Gemini puede tardar más de un minuto.
// La función de Vercel tiene hasta 300 s (maxDuration en vercel.json).
const GEMINI_TIMEOUT = 150_000;
const GROQ_TIMEOUT = 90_000;

/** "HTTP 429: Resource has been exhausted…", sin datos de la cuenta. */
async function httpError(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  let msg = '';
  try {
    const j = JSON.parse(body) as { error?: { message?: string } | string };
    msg = typeof j.error === 'string' ? j.error : j.error?.message || '';
  } catch { msg = body; }
  return `HTTP ${res.status}${msg ? `: ${msg.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`;
}

const reason = (err: unknown) => {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) return 'tardó demasiado';
  return err instanceof Error ? err.message : String(err);
};

interface Provider { name: string; call: (system: string, user: string, f: Fetch) => Promise<string> }

function providers(env: PlanEnv): Provider[] {
  const list: Provider[] = [];
  if (env.GEMINI_API_KEY) {
    const model = env.GEMINI_MODEL || 'gemini-flash-latest';
    list.push({
      name: 'Gemini',
      async call(system, user, f) {
        const res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 16384 },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT),
        });
        if (!res.ok) throw new Error(await httpError(res));
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (!out) throw new Error('respuesta vacía');
        return out;
      },
    });
  }
  if (env.GROQ_API_KEY) {
    const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    list.push({
      name: 'Groq',
      async call(system, user, f) {
        const res = await f('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 7000,
          }),
          signal: AbortSignal.timeout(GROQ_TIMEOUT),
        });
        if (!res.ok) throw new Error(await httpError(res));
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const out = data.choices?.[0]?.message?.content || '';
        if (!out) throw new Error('respuesta vacía');
        return out;
      },
    });
  }
  return list;
}

export function parseJson(text: string): Record<string, unknown> {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('la respuesta no es JSON');
  const parsed = JSON.parse(clean.slice(start, end + 1));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('la respuesta no es un objeto');
  return parsed as Record<string, unknown>;
}

const minutesOfText = (t: string) => { const m = /(\d+)/.exec(t); return m ? Number(m[1]) : 90; };

export function toResponse(req: PlanRequest, raw: Record<string, unknown>, proveedor: string): PlanResponse {
  const titulo = (typeof raw.titulo === 'string' ? raw.titulo : req.tema).replace(/^["«“]|["»”]$/g, '').trim().slice(0, 200) || req.tema;
  if (req.kind === 'unidad') {
    const doc = normalizeUnidad({ ...raw, numero: req.numero }, req.numero);
    if (!doc.proposito.length || !doc.sesiones.length) throw new Error('la unidad llegó incompleta');
    return { titulo, doc, proveedor };
  }
  const doc = normalizeSesion({ ...raw, numero: req.unidad?.sesionNumero || req.numero, unidad: req.unidad?.numero || 1 }, req.unidad?.sesionNumero || req.numero, req.unidad?.numero || 1, minutesOfText(req.duracion));
  if (!doc.proposito.length || !doc.desarrollo.actividades) throw new Error('la sesión llegó incompleta');
  return { titulo, doc, proveedor };
}

// ----- Respuesta de ejemplo para las pruebas con emuladores -----

function fakeResponse(req: PlanRequest): PlanResponse {
  const comps = competenciasOf(req.area, req.level).slice(0, 2);
  const proposito = comps.map((c, i) => ({
    competencia: c.name.toUpperCase(), capacidades: c.capacidades.slice(0, 2),
    desempenos: [`${i + 1}.1 Desempeño sobre ${req.tema}.`], estandar: `Estándar del ciclo para ${c.name}.`, criterios: [`Explica ${req.tema} con ejemplos.`, `Aplica ${req.tema} en una situación real.`],
  }));
  if (req.kind === 'unidad') {
    const n = req.sesiones || 4;
    return toResponse(req, {
      titulo: `Aprendemos ${req.tema}`,
      situacion: `Los estudiantes de ${req.grade} necesitan comprender ${req.tema}.`,
      reto: `¿Cómo podemos usar ${req.tema} en nuestra vida diaria?`,
      proposito,
      transversales: [{ competencia: 'Gestiona su aprendizaje de manera autónoma', capacidad: 'Monitorea y ajusta su desempeño', descripcion: 'Registra sus avances.' }],
      enfoques: [{ enfoque: 'Enfoque de derechos', valor: 'Conciencia de derechos', actitudes: 'Todos opinan.' }],
      sesiones: Array.from({ length: n }, (_, i) => ({ titulo: `Sesión ${i + 1} de ${req.tema}`, competencias: [comps[0]?.name || ''], desempenos: ['1.1'], proposito: `Propósito ${i + 1}.`, instrumentos: ['Lista de cotejo'] })),
      evaluacion: [{ competencia: comps[0]?.name || '', tecnica: 'Observación', instrumentos: ['Lista de cotejo'], desempenos: ['1.1'], sesiones: 'Sesiones 1 y 2' }],
      bibliografia: ['Ministerio de Educación del Perú. (2016). Currículo Nacional de la Educación Básica. Lima: MINEDU.'],
    }, 'Ejemplo');
  }
  return toResponse(req, {
    titulo: req.unidad?.sesion.titulo || `Sesión de ${req.tema}`,
    proposito: proposito.map(({ estandar: _e, ...p }) => p),
    propositoTexto: `Comprender ${req.tema}.`,
    evidencia: `Explica ${req.tema} con un ejemplo.`,
    transversal: { competencia: 'GESTIONA SU APRENDIZAJE DE MANERA AUTÓNOMA', capacidades: ['Define metas de aprendizaje'] },
    enfoques: [{ enfoque: 'Enfoque de derechos', accion: 'Todos participan.' }],
    inicio: { actividades: '• Saludo y saberes previos (10 min).', minutos: 15, materiales: ['Pizarra'] },
    desarrollo: { actividades: `Actividad 1: Exploramos ${req.tema} (30 min).`, minutos: 45, materiales: ['Fichas'] },
    cierre: { actividades: '¿Qué aprendimos hoy?', minutos: 10, materiales: [] },
    rubrica: proposito.flatMap((p) => p.criterios).map((c) => ({ criterio: c, destacado: 'Lo hace siempre.', esperado: 'Lo hace.', proceso: 'Lo hace con ayuda.', inicio: 'Aún no lo hace.' })),
  }, 'Ejemplo');
}

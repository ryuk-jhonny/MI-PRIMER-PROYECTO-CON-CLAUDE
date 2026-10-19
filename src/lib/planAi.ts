// Planificación con IA desde la app: pide el documento a /api/planificar y lo lleva a un Plan.
import { competenciasOf, ENFOQUES_TRANSVERSALES, INSTRUMENTOS } from './cneb';
import { fb } from './firebase';
import type { PlanDoc, PropositoFila, SesionDoc, UnidadDoc } from './planDoc';
import type { Plan } from './store';

export interface AiRequest {
  kind: 'unidad' | 'sesion';
  area: string;
  level: Plan['level'];
  grade: string;
  tema: string;
  duracion: string;
  numero: number;
  sesiones?: number;
  notas?: string;
  unidad?: { titulo: string; situacion: string; reto: string; numero: number; proposito: PropositoFila[]; sesion: UnidadDoc['sesiones'][number]; sesionNumero: number };
}

export interface AiResult { titulo: string; doc: PlanDoc; proveedor: string }

export async function generateWithAi(req: AiRequest): Promise<AiResult> {
  const user = fb().auth.currentUser;
  if (!user) throw new Error('Vuelve a iniciar sesión.');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch('/api/planificar', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(req) });
  } catch {
    throw new Error('Sin conexión. Revisa tu internet y vuelve a intentar.');
  }
  const body = (await res.json().catch(() => ({}))) as Partial<AiResult> & { error?: string };
  if (!res.ok || !body.doc) throw new Error(body.error || 'La IA no respondió esta vez. Vuelve a intentar.');
  return body as AiResult;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const instrumentoOf = (list: string[]) => INSTRUMENTOS.find((i) => list.some((x) => norm(x).startsWith(norm(i))));

/** Los campos sencillos del Plan (lista, lista de cotejo, filtros) salen del documento completo. */
export function withDetalle(p: Plan, d: PlanDoc): Plan {
  const comps = competenciasOf(p.area, p.level);
  const rows = d.proposito;
  const ids = comps.filter((c) => rows.some((r) => { const a = norm(r.competencia); const b = norm(c.name); return a === b || a.includes(b) || b.includes(a); })).map((c) => c.id);
  const capacidades = [...new Set(rows.flatMap((r) => r.capacidades))];
  const desempenos = rows.flatMap((r) => r.desempenos).join('\n');
  const criterios = rows.flatMap((r) => r.criterios).join('\n');
  const enfoqueNames = (d.tipo === 'unidad' ? d.enfoques.map((e) => e.enfoque) : d.enfoques.map((e) => e.enfoque)).map(norm);
  const enfoques = ENFOQUES_TRANSVERSALES.filter((e) => enfoqueNames.some((n) => n && (norm(e).includes(n.replace(/^enfoque /, '')) || n.includes(norm(e).replace(/^enfoque /, '')))));
  const base = { ...p, detalle: d, competencias: ids, capacidades, desempenos, criterios, enfoques };
  if (d.tipo === 'unidad') {
    const u = d as UnidadDoc;
    return {
      ...base,
      situacion: [u.situacion, u.reto ? `Reto: ${u.reto}` : ''].filter(Boolean).join('\n\n'),
      instrumento: instrumentoOf(u.sesiones.flatMap((s) => s.instrumentos)) || p.instrumento,
      materiales: u.bibliografia.join('\n'),
    };
  }
  const s = d as SesionDoc;
  return {
    ...base,
    proposito: s.propositoTexto,
    evidencia: s.evidencia,
    instrumento: s.rubrica.length ? 'Rúbrica' : p.instrumento,
    inicio: s.inicio.actividades,
    desarrollo: s.desarrollo.actividades,
    cierre: s.cierre.actividades,
    materiales: [...new Set([...s.inicio.materiales, ...s.desarrollo.materiales, ...s.cierre.materiales])].join('\n'),
  };
}

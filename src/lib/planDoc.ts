// Documento completo de una unidad o sesión con la estructura del docente
// (la que arma la IA y se descarga en Word). Lo usan la app y el servidor.

export interface PropositoFila {
  competencia: string;
  capacidades: string[];
  desempenos: string[];
  estandar: string;
  criterios: string[];
}

export interface TransversalFila { competencia: string; capacidad: string; descripcion: string }
export interface EnfoqueFila { enfoque: string; valor: string; actitudes: string }

export interface SesionFila {
  titulo: string;
  competencias: string[];
  desempenos: string[];
  proposito: string;
  instrumentos: string[];
}

export interface EvaluacionFila {
  competencia: string;
  tecnica: string;
  instrumentos: string[];
  desempenos: string[];
  sesiones: string;
}

export interface UnidadDoc {
  tipo: 'unidad';
  numero: number;
  situacion: string;
  reto: string;
  proposito: PropositoFila[];
  transversales: TransversalFila[];
  enfoques: EnfoqueFila[];
  sesiones: SesionFila[];
  evaluacion: EvaluacionFila[];
  bibliografia: string[];
}

export interface Momento { actividades: string; minutos: number; materiales: string[] }

export interface RubricaFila { criterio: string; destacado: string; esperado: string; proceso: string; inicio: string }

export interface SesionDoc {
  tipo: 'sesion';
  numero: number;
  unidad: number;
  proposito: PropositoFila[];
  propositoTexto: string;
  evidencia: string;
  transversal: { competencia: string; capacidades: string[] };
  enfoques: { enfoque: string; accion: string }[];
  inicio: Momento;
  desarrollo: Momento;
  cierre: Momento;
  rubrica: RubricaFila[];
}

export type PlanDoc = UnidadDoc | SesionDoc;

// ----- Normalización: lo que llegue de la IA (o de la base) se lleva a esta forma -----

const MAX = 4000;
const str = (v: unknown, max = MAX): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim().slice(0, max);
const list = (v: unknown, max = 20): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map((x) => str(x, 1200).replace(/^[•\-*]\s*/, '')).filter(Boolean).slice(0, max);
const rows = <T>(v: unknown, f: (o: Record<string, unknown>) => T, max = 12): T[] =>
  (Array.isArray(v) ? v : []).filter((o) => o && typeof o === 'object').slice(0, max).map((o) => f(o as Record<string, unknown>));
const num = (v: unknown, def: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 && n < 1000 ? n : def; };

const proposito = (o: Record<string, unknown>): PropositoFila => ({
  competencia: str(o.competencia, 300), capacidades: list(o.capacidades), desempenos: list(o.desempenos), estandar: str(o.estandar), criterios: list(o.criterios),
});
const momento = (v: unknown, def: number): Momento => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { actividades: str(o.actividades, 8000), minutos: num(o.minutos, def), materiales: list(o.materiales) };
};

export function normalizeUnidad(raw: unknown, numero = 1): UnidadDoc {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    tipo: 'unidad',
    numero: num(o.numero, numero),
    situacion: str(o.situacion, 6000),
    reto: str(o.reto),
    proposito: rows(o.proposito, proposito, 6),
    transversales: rows(o.transversales, (t) => ({ competencia: str(t.competencia, 300), capacidad: str(t.capacidad, 300), descripcion: str(t.descripcion) }), 4),
    enfoques: rows(o.enfoques, (e) => ({ enfoque: str(e.enfoque, 200), valor: str(e.valor, 200), actitudes: str(e.actitudes) }), 6),
    sesiones: rows(o.sesiones, (x) => ({ titulo: str(x.titulo, 300), competencias: list(x.competencias), desempenos: list(x.desempenos), proposito: str(x.proposito), instrumentos: list(x.instrumentos) }), 16),
    evaluacion: rows(o.evaluacion, (x) => ({ competencia: str(x.competencia, 300), tecnica: str(x.tecnica, 300), instrumentos: list(x.instrumentos), desempenos: list(x.desempenos), sesiones: str(x.sesiones, 200) }), 6),
    bibliografia: list(o.bibliografia, 12),
  };
}

export function normalizeSesion(raw: unknown, numero = 1, unidad = 1, minutosTotal = 90): SesionDoc {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const t = (o.transversal && typeof o.transversal === 'object' ? o.transversal : {}) as Record<string, unknown>;
  const inicio = Math.max(5, Math.round(minutosTotal * 0.2));
  const cierre = Math.max(5, Math.round(minutosTotal * 0.15));
  return {
    tipo: 'sesion',
    numero: num(o.numero, numero),
    unidad: num(o.unidad, unidad),
    proposito: rows(o.proposito, proposito, 4),
    propositoTexto: str(o.propositoTexto),
    evidencia: str(o.evidencia),
    transversal: { competencia: str(t.competencia, 300), capacidades: list(t.capacidades) },
    enfoques: rows(o.enfoques, (e) => ({ enfoque: str(e.enfoque, 200), accion: str(e.accion) }), 4),
    inicio: momento(o.inicio, inicio),
    desarrollo: momento(o.desarrollo, Math.max(10, minutosTotal - inicio - cierre)),
    cierre: momento(o.cierre, cierre),
    rubrica: rows(o.rubrica, (r) => ({ criterio: str(r.criterio, 600), destacado: str(r.destacado, 800), esperado: str(r.esperado, 800), proceso: str(r.proceso, 800), inicio: str(r.inicio, 800) }), 8),
  };
}

export function normalizeDoc(raw: unknown): PlanDoc | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (o.tipo === 'unidad') return normalizeUnidad(o);
  if (o.tipo === 'sesion') return normalizeSesion(o);
  return undefined;
}

/** Minutos escritos como "70 min", "90 minutos" o "1 h 30". */
export function minutesOf(text: string, def = 90): number {
  const h = /(\d+)\s*h/i.exec(text);
  const m = /(\d+)\s*(min|$)/i.exec(text.replace(/(\d+)\s*h/i, ''));
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total > 0 ? total : def;
}

/** "12 de octubre del 2026" a partir de "2026-10-12". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${months[m - 1]} del ${y}`;
}

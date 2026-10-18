// Horario semanal de cada docente: bloques de clase por día, hora, aula y área.

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
export type Day = 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassBlock {
  id: string;
  day: Day;
  start: string; // "08:00"
  end: string; // "08:45"
  aula: string; // "3ro Primaria · A"
  area: string;
}

export interface TeacherSchedule {
  ownerUid: string;
  ownerName: string;
  blocks: ClassBlock[];
  updatedAt: string;
}

/** Un bloque de otra persona, con su docente, para la vista del colegio y la de la sección. */
export interface OwnedBlock extends ClassBlock { ownerUid: string; ownerName: string }

export const MAX_BLOCKS = 80;

export const dayName = (d: number) => DAYS[d - 1] || '';
const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };

export function sortBlocks<T extends ClassBlock>(list: T[]): T[] {
  return [...list].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

export function overlaps(a: ClassBlock, b: ClassBlock): boolean {
  return a.day === b.day && mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end);
}

/** Problemas de un bloque antes de guardarlo: horas al revés o cruce con otro bloque propio. */
export function blockError(b: ClassBlock, mine: ClassBlock[]): string {
  if (!/^\d{2}:\d{2}$/.test(b.start) || !/^\d{2}:\d{2}$/.test(b.end)) return 'Escribe la hora de inicio y de fin.';
  if (mins(b.end) <= mins(b.start)) return 'La hora de fin debe ser después de la de inicio.';
  if (!b.aula) return 'Elige el aula.';
  if (!b.area) return 'Elige el área.';
  const clash = mine.find((o) => o.id !== b.id && overlaps(o, b));
  if (clash) return `Se cruza con tu clase de ${clash.area} en ${clash.aula} (${dayName(clash.day)} ${clash.start}–${clash.end}).`;
  return '';
}

/** Dos docentes distintos en la misma aula a la misma hora. */
export function conflicts(all: OwnedBlock[]): [OwnedBlock, OwnedBlock][] {
  const out: [OwnedBlock, OwnedBlock][] = [];
  const list = sortBlocks(all);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length && list[j].day === list[i].day; j++) {
      const a = list[i];
      const b = list[j];
      if (a.ownerUid !== b.ownerUid && a.aula === b.aula && overlaps(a, b)) out.push([a, b]);
    }
  }
  return out;
}

/** Día (1 = lunes … 7 = domingo) y hora "HH:MM" en la zona horaria del colegio. */
export function nowIn(timeZone = 'America/Lima', at = new Date()): { day: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { day, time: `${get('hour')}:${get('minute')}` };
}

/** La clase en curso o la próxima de la semana, con cuánto falta. */
export function nextClass<T extends ClassBlock>(blocks: T[], now: { day: number; time: string }): { block: T; current: boolean; today: boolean } | null {
  if (!blocks.length) return null;
  const t = mins(now.time);
  const sorted = sortBlocks(blocks);
  const current = sorted.find((b) => b.day === now.day && mins(b.start) <= t && t < mins(b.end));
  if (current) return { block: current, current: true, today: true };
  const later = sorted.find((b) => b.day === now.day && mins(b.start) > t)
    || sorted.find((b) => b.day > now.day)
    || sorted[0];
  return { block: later, current: false, today: later.day === now.day };
}

/** Horas distintas de inicio, para armar las filas de la grilla semanal. */
export function timeRows(blocks: ClassBlock[]): string[] {
  return [...new Set(blocks.map((b) => `${b.start}–${b.end}`))].sort();
}

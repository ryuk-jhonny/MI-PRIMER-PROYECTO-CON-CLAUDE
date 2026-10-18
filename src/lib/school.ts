import { Student, StudentCourseGrade, CnebLiteralGrade } from '../types/education';
import { EducationalLevel, InstitutionConfig } from '../types/institution';

export type Literal = CnebLiteralGrade | '';
export const LITERALS: CnebLiteralGrade[] = ['AD', 'A', 'B', 'C'];

/** Áreas curriculares del CNEB por nivel (MINEDU). */
export const CNEB_AREAS: Record<EducationalLevel, string[]> = {
  inicial: ['Personal Social', 'Psicomotriz', 'Comunicación', 'Matemática', 'Ciencia y Tecnología'],
  primaria: ['Personal Social', 'Educación Física', 'Comunicación', 'Arte y Cultura', 'Inglés', 'Matemática', 'Ciencia y Tecnología', 'Educación Religiosa'],
  secundaria: [
    'Desarrollo Personal, Ciudadanía y Cívica', 'Ciencias Sociales', 'Educación Física', 'Arte y Cultura', 'Comunicación',
    'Inglés', 'Matemática', 'Ciencia y Tecnología', 'Educación para el Trabajo', 'Educación Religiosa',
  ],
};

export function levelOf(s: Student): EducationalLevel {
  const l = (s.educationalLevel || '').toLowerCase();
  const g = (s.gradeLevel || '').toLowerCase();
  if (l.includes('ini') || g.includes('ini') || g.includes('año')) return 'inicial';
  if (l.includes('pri') || g.includes('pri')) return 'primaria';
  return 'secundaria';
}

export function aulaOf(s: Student): string {
  return `${s.gradeLevel} · ${s.section}`.trim();
}

export function periodCount(cfg: InstitutionConfig): number {
  return cfg.periodType === 'trimestral' ? 3 : 4;
}

export function periodLabel(cfg: InstitutionConfig, i: number): string {
  return `${cfg.periodType === 'trimestral' ? 'Trim.' : 'Bim.'} ${['I', 'II', 'III', 'IV'][i]}`;
}

const SCORE: Record<CnebLiteralGrade, number> = { AD: 4, A: 3, B: 2, C: 1 };

/** Promedio literal: AD=4, A=3, B=2, C=1, redondeado al nivel más cercano. */
export function averageLiteral(values: Literal[]): Literal {
  const nums = values.filter((v): v is CnebLiteralGrade => !!v).map((v) => SCORE[v]);
  if (!nums.length) return '';
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg >= 3.5 ? 'AD' : avg >= 2.5 ? 'A' : avg >= 1.5 ? 'B' : 'C';
}

export function statusOf(l: Literal): StudentCourseGrade['status'] {
  return l === 'AD' ? 'Logro Destacado' : l === 'A' ? 'Logro Esperado' : l === 'B' ? 'En Proceso' : l === 'C' ? 'En Inicio' : 'Sin calificar';
}

const UNIT_KEYS = ['unit1', 'unit2', 'unit3', 'unit4'] as const;

export function unitsOf(g: StudentCourseGrade | undefined, n: number): Literal[] {
  return UNIT_KEYS.slice(0, n).map((k) => ((g?.[k] as Literal) || ''));
}

/** Convierte nombres libres de cursos ("Matemática y Cálculo") al área CNEB oficial. */
export function canonicalGrades(s: Student): Student {
  const all = [...new Set(Object.values(CNEB_AREAS).flat())];
  const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const grades = (s.grades || []).map((g) => {
    const name = plain(g.courseName);
    const hit = all.find((a) => name.startsWith(plain(a))) ||
      (name.includes('sociales') ? 'Ciencias Sociales' : name.includes('ingles') ? 'Inglés' : name.includes('ciencia') ? 'Ciencia y Tecnología' : undefined);
    return hit ? { ...g, courseName: hit, courseId: courseId(hit) } : g;
  });
  return { ...s, grades };
}

function courseId(area: string) {
  return 'cneb-' + area.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
}

export function findGrade(s: Student, area: string): StudentCourseGrade | undefined {
  const id = courseId(area);
  return (s.grades || []).find((g) => g.courseId === id || g.courseName === area);
}

/** Devuelve una copia del alumno con una nota cambiada y su promedio recalculado. */
export function setGrade(s: Student, area: string, unit: number, value: Literal, n: number, teacherName = ''): Student {
  const grades = [...(s.grades || [])];
  const idx = grades.findIndex((g) => g.courseId === courseId(area) || g.courseName === area);
  const base: StudentCourseGrade = idx >= 0 ? { ...grades[idx] } : {
    courseId: courseId(area), courseName: area, teacherName, unit1: '', unit2: '', unit3: '', unit4: '', average: '', status: 'Sin calificar', recentFeedback: '',
  };
  (base as unknown as Record<string, Literal>)[UNIT_KEYS[unit]] = value;
  base.average = averageLiteral(unitsOf(base, n));
  base.status = statusOf(base.average);
  if (teacherName && !base.teacherName) base.teacherName = teacherName;
  if (idx >= 0) grades[idx] = base; else grades.push(base);
  return { ...s, grades };
}

export function setFeedback(s: Student, area: string, text: string): Student {
  const grades = (s.grades || []).map((g) => (g.courseId === courseId(area) || g.courseName === area ? { ...g, recentFeedback: text } : g));
  return { ...s, grades };
}

export function overallLiteral(s: Student): Literal {
  return averageLiteral((s.grades || []).map((g) => g.average));
}

export const LITERAL_STYLE: Record<string, string> = {
  AD: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  A: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  B: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  C: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  '': 'bg-slate-800/60 text-slate-500 border-slate-700',
};

/** Descarga un CSV que Excel abre bien (con BOM y punto y coma). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function waLink(phone: string | undefined, text: string): string | null {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith('9')) digits = '51' + digits; // celular peruano sin código de país
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w && !/^(dr|dra|mg|lic|prof|ing)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
}

import type { RubricScores } from './store';
import type { Literal } from './school';

// Calificación con rúbrica (puntajes 4 a 1) llevada a las notas por competencia del CNEB.

/** Puntaje promedio de la rúbrica (4 a 1) llevado a la escala CNEB. */
export function literalOfScore(avg: number): Literal {
  return avg >= 3.5 ? 'AD' : avg >= 2.5 ? 'A' : avg >= 1.5 ? 'B' : 'C';
}

/**
 * Notas por competencia de un periodo a partir de todas las rúbricas calificadas de ese periodo:
 * para cada estudiante, el promedio de los criterios que evalúan cada competencia.
 */
export function competencyFromRubrics(docs: RubricScores[]): Record<string, Record<string, Literal>> {
  const sums: Record<string, Record<string, number[]>> = {};
  docs.forEach((d) => Object.entries(d.scores).forEach(([sid, row]) => Object.entries(row).forEach(([idx, v]) => {
    const comp = d.links[idx];
    if (!comp || !(v >= 1 && v <= 4)) return;
    ((sums[sid] ||= {})[comp] ||= []).push(v);
  })));
  return Object.fromEntries(Object.entries(sums).map(([sid, byComp]) => [sid, Object.fromEntries(Object.entries(byComp).map(([c, l]) => [c, literalOfScore(l.reduce((a, b) => a + b, 0) / l.length)]))]));
}

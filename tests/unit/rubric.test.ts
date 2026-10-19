import { describe, expect, it } from 'vitest';
import { competencyFromRubrics, literalOfScore } from '../../src/lib/rubric';

const doc = (planId: string, links: Record<string, string>, scores: Record<string, Record<string, number>>) =>
  ({ id: planId, ownerUid: 'doc', planId, aula: '1ro Primaria · A', links, scores, updatedAt: '' });

describe('notas desde la rúbrica', () => {
  it('lleva el puntaje 4 a 1 a AD, A, B y C', () => {
    expect([4, 3.5, 3, 2.5, 2, 1.5, 1].map(literalOfScore)).toEqual(['AD', 'AD', 'A', 'A', 'B', 'B', 'C']);
  });
  it('promedia los criterios de cada competencia en todas las sesiones del periodo', () => {
    const r = competencyFromRubrics([
      doc('s1', { 0: 'c23', 1: 'c24' }, { st1: { 0: 4, 1: 2 }, st2: { 0: 1 } }),
      doc('s2', { 0: 'c23', 1: '' }, { st1: { 0: 3, 1: 4 } }),
    ]);
    expect(r.st1).toEqual({ c23: 'AD', c24: 'B' });
    expect(r.st2).toEqual({ c23: 'C' });
  });
});

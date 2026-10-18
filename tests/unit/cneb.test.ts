import { describe, expect, it } from 'vitest';
import { AREAS, areasOf, cicloOf, COMPETENCIAS, competenciasOf, gradeNumber } from '../../src/lib/cneb';

describe('Currículo CNEB', () => {
  it('tiene las 29 competencias de área y las 2 transversales que usa la EBR', () => {
    // 1–9, 13–31 (las 10–12 son de Castellano como segunda lengua, fuera del alcance).
    expect(Object.keys(COMPETENCIAS)).toHaveLength(28);
    expect(COMPETENCIAS[28].name).toMatch(/entornos virtuales/);
    expect(COMPETENCIAS[29].name).toMatch(/aprendizaje de manera autónoma/);
  });

  it('cada competencia tiene al menos dos capacidades', () => {
    Object.values(COMPETENCIAS).forEach((c) => expect(c.capacidades.length).toBeGreaterThanOrEqual(2));
  });

  it('primaria tiene 8 áreas y secundaria 10, en el orden de la libreta', () => {
    expect(areasOf('primaria')).toEqual([
      'Personal Social', 'Educación Física', 'Comunicación', 'Arte y Cultura', 'Inglés', 'Matemática', 'Ciencia y Tecnología', 'Educación Religiosa',
    ]);
    expect(areasOf('secundaria')).toEqual([
      'Desarrollo Personal, Ciudadanía y Cívica', 'Ciencias Sociales', 'Educación Física', 'Comunicación', 'Arte y Cultura', 'Inglés',
      'Matemática', 'Ciencia y Tecnología', 'Educación para el Trabajo', 'Educación Religiosa',
    ]);
  });

  it('asigna las competencias oficiales a cada área', () => {
    expect(competenciasOf('Matemática', 'primaria').map((c) => c.n)).toEqual([23, 24, 25, 26]);
    expect(competenciasOf('Personal Social', 'primaria').map((c) => c.n)).toEqual([1, 16, 17, 18, 19]);
    expect(competenciasOf('Ciencias Sociales', 'secundaria').map((c) => c.n)).toEqual([17, 18, 19]);
    expect(competenciasOf('Educación Física', 'secundaria').map((c) => c.n)).toEqual([2, 3, 4]);
    expect(competenciasOf('Personal Social', 'secundaria')).toEqual([]);
  });

  it('todas las áreas referencian competencias existentes', () => {
    AREAS.forEach((a) => Object.values(a.competencias).flat().forEach((n) => expect(COMPETENCIAS[n!]).toBeDefined()));
  });

  it('reconoce el grado y el ciclo', () => {
    expect(gradeNumber('3ro Primaria')).toBe(3);
    expect(gradeNumber('Quinto de secundaria')).toBe(5);
    expect(cicloOf(2, 'primaria')).toBe('III');
    expect(cicloOf(4, 'primaria')).toBe('IV');
    expect(cicloOf(6, 'primaria')).toBe('V');
    expect(cicloOf(2, 'secundaria')).toBe('VI');
    expect(cicloOf(5, 'secundaria')).toBe('VII');
  });
});

import { describe, expect, it } from 'vitest';
import { activePeriodIndex, averageLiteral, compUnitsOf, findGrade, imcOf, levelOf, periodNames, setCompGrade, setFeedback, unitsOf, waLink } from '../../src/lib/school';
import { DEFAULT_INSTITUTION_CONFIG } from '../../src/types/institution';
import { Student } from '../../src/types/education';

const student = (): Student => ({
  id: 'st_1', qrCodeValue: '', fullName: 'Estudiante de prueba', enrollmentCode: '', gradeLevel: '3ro Primaria', section: 'A', avatarUrl: '',
  institutionName: '', academicYear: '2026', attendanceRate: 0, totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, grades: [],
});

describe('Promedios CNEB', () => {
  it('promedia literales con AD=4, A=3, B=2, C=1 y redondea al más cercano', () => {
    expect(averageLiteral(['AD', 'A'])).toBe('AD'); // 3.5
    expect(averageLiteral(['A', 'B'])).toBe('A'); // 2.5
    expect(averageLiteral(['B', 'C'])).toBe('B'); // 1.5
    expect(averageLiteral(['C', 'C', 'B'])).toBe('C'); // 1.33
    expect(averageLiteral(['', '', ''])).toBe('');
    expect(averageLiteral(['A', '', ''])).toBe('A');
  });

  it('calcula el área por periodo a partir de sus competencias y el final a partir de los periodos', () => {
    let s = student();
    s = setCompGrade(s, 'Matemática', 'c23', 0, 'AD', 4, 'Docente');
    s = setCompGrade(s, 'Matemática', 'c24', 0, 'A', 4);
    s = setCompGrade(s, 'Matemática', 'c25', 0, 'B', 4);
    let g = findGrade(s, 'Matemática')!;
    expect(unitsOf(g, 4)).toEqual(['A', '', '', '']); // (4+3+2)/3 = 3
    expect(g.average).toBe('A');
    expect(g.status).toBe('Logro Esperado');
    expect(g.teacherName).toBe('Docente');

    s = setCompGrade(s, 'Matemática', 'c23', 1, 'C', 4);
    g = findGrade(s, 'Matemática')!;
    expect(compUnitsOf(g, 'c23', 4)).toEqual(['AD', 'C', '', '']);
    expect(unitsOf(g, 4)).toEqual(['A', 'C', '', '']);
    expect(g.average).toBe('B'); // (3+1)/2 = 2
  });

  it('borrar una nota recalcula sin ella', () => {
    let s = setCompGrade(student(), 'Comunicación', 'c7', 0, 'C', 3);
    s = setCompGrade(s, 'Comunicación', 'c8', 0, 'AD', 3);
    s = setCompGrade(s, 'Comunicación', 'c7', 0, '', 3);
    expect(findGrade(s, 'Comunicación')!.unit1).toBe('AD');
  });

  it('no modifica el objeto original', () => {
    const s = student();
    setCompGrade(s, 'Arte y Cultura', 'c5', 0, 'A', 4);
    expect(s.grades).toEqual([]);
  });

  it('guarda la conclusión descriptiva', () => {
    const s = setFeedback(setCompGrade(student(), 'Inglés', 'c13', 0, 'A', 4), 'Inglés', 'Participa con fluidez.');
    expect(findGrade(s, 'Inglés')!.recentFeedback).toBe('Participa con fluidez.');
  });
});

describe('Ayudas escolares', () => {
  it('detecta el nivel del estudiante', () => {
    expect(levelOf({ gradeLevel: '2do Secundaria' })).toBe('secundaria');
    expect(levelOf({ gradeLevel: '6to Primaria' })).toBe('primaria');
    expect(levelOf({ gradeLevel: '1ro', educationalLevel: 'Secundaria' })).toBe('secundaria');
  });

  it('lee el periodo activo', () => {
    expect(activePeriodIndex({ ...DEFAULT_INSTITUTION_CONFIG, activePeriod: 'Bimestre III' })).toBe(2);
    expect(activePeriodIndex({ ...DEFAULT_INSTITUTION_CONFIG, activePeriod: 'Trimestre II' })).toBe(1);
    expect(periodNames({ ...DEFAULT_INSTITUTION_CONFIG, periodType: 'trimestral' })).toEqual(['Trimestre I', 'Trimestre II', 'Trimestre III']);
  });

  it('calcula el IMC con un decimal', () => {
    expect(imcOf(45, 150)).toBe(20);
    expect(imcOf(38.5, 142)).toBe(19.1);
    expect(imcOf(0, 150)).toBe(0);
  });

  it('arma enlaces de WhatsApp para celulares peruanos', () => {
    expect(waLink('987 654 321', 'Hola')).toBe('https://wa.me/51987654321?text=Hola');
    expect(waLink('', 'Hola')).toBeNull();
  });
});

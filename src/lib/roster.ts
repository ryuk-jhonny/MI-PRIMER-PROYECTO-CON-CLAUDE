import { InstitutionConfig } from '../types/institution';
import { gradeNumber, LEVEL_LABEL } from './cneb';

/** Grados activos del colegio (según Configuración). */
export function gradeOptions(config: InstitutionConfig) {
  return config.gradeConfigs.filter((g) => g.enabled && config.activeLevels.includes(g.level));
}

export interface RosterRow { fullName: string; dni: string; gradeLevel: string; section: string; parentName: string; parentPhone: string; error: string }

/** Lee filas pegadas desde Excel o un CSV: DNI, Apellidos y nombres, Nivel, Grado, Sección, Apoderado, Celular. */
export function parseRoster(text: string, config: InstitutionConfig): RosterRow[] {
  const grades = gradeOptions(config);
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).flatMap((line, i) => {
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const p = line.split(sep).map((x) => x.trim().replace(/^["']|["']$/g, ''));
    if (i === 0 && /dni|nombre|apellido/i.test(line)) return [];
    const [dni = '', fullName = '', levelRaw = '', gradeRaw = '', section = 'A', parentName = '', parentPhone = ''] = p;
    const level = /sec/i.test(levelRaw) ? 'secundaria' : /pri/i.test(levelRaw) ? 'primaria' : /sec/i.test(gradeRaw) ? 'secundaria' : 'primaria';
    const num = gradeNumber(gradeRaw || levelRaw);
    const gc = grades.find((g) => g.level === level && gradeNumber(g.gradeName) === num);
    let error = '';
    if (fullName.length < 3) error = 'Falta el nombre';
    else if (dni && !/^\d{8}$/.test(dni)) error = 'DNI debe tener 8 dígitos';
    else if (!gc) error = `No existe ${num}.° de ${LEVEL_LABEL[level]} en Configuración`;
    return [{ dni, fullName: fullName.replace(/\s+/g, ' '), gradeLevel: gc?.gradeName || '', section: (section || 'A').toUpperCase(), parentName, parentPhone, error }];
  });
}


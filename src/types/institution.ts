import type { Level } from '../lib/cneb';
import { BellConfig, DEFAULT_BELL } from '../lib/schedule';

export type EducationalLevel = Level;
export type AcademicPeriodType = 'bimestral' | 'trimestral';
export type ShiftType = 'Mañana' | 'Tarde' | 'Completa' | 'Doble Turno';

export interface GradeSectionConfig {
  gradeId: string;
  gradeName: string;
  level: EducationalLevel;
  sections: string[];
  capacityPerSection: number;
  enabled: boolean;
}

export interface InstitutionConfig {
  institutionName: string;
  shortName: string;
  modularCodePrimaria: string;
  modularCodeSecundaria: string;
  localCode: string;
  dre: string;
  ugel: string;
  directorName: string;
  directorDni: string;
  motto: string;
  academicYear: string;
  shift: ShiftType;
  activeLevels: EducationalLevel[];
  periodType: AcademicPeriodType;
  activePeriod: string;
  doorOpeningTime: string; // "07:15"
  punctualCutoffTime: string; // "07:45"
  lateCutoffTime: string; // "08:15"
  gradeConfigs: GradeSectionConfig[];
  /** Zona horaria usada para decidir Puntual / Tardanza. */
  timeZone?: string;
  /** Bloques de clase de la jornada (horas pedagógicas y recreos). */
  bell?: BellConfig;
}

const ORD = ['1ro', '2do', '3ro', '4to', '5to', '6to'];

export const DEFAULT_GRADE_CONFIGS: GradeSectionConfig[] = [
  ...ORD.map((o, i) => ({ gradeId: `pri-${i + 1}`, gradeName: `${o} Primaria`, level: 'primaria' as const, sections: ['A'], capacityPerSection: 30, enabled: true })),
  ...ORD.slice(0, 5).map((o, i) => ({ gradeId: `sec-${i + 1}`, gradeName: `${o} Secundaria`, level: 'secundaria' as const, sections: ['A'], capacityPerSection: 32, enabled: true })),
];

/** Configuración vacía: cada colegio completa sus propios datos. */
export const DEFAULT_INSTITUTION_CONFIG: InstitutionConfig = {
  institutionName: '',
  shortName: '',
  modularCodePrimaria: '',
  modularCodeSecundaria: '',
  localCode: '',
  dre: '',
  ugel: '',
  directorName: '',
  directorDni: '',
  motto: '',
  academicYear: String(new Date().getFullYear()),
  shift: 'Mañana',
  activeLevels: ['primaria', 'secundaria'],
  periodType: 'bimestral',
  activePeriod: 'Bimestre I',
  doorOpeningTime: '07:15',
  punctualCutoffTime: '07:45',
  lateCutoffTime: '08:15',
  gradeConfigs: DEFAULT_GRADE_CONFIGS,
  timeZone: 'America/Lima',
  bell: DEFAULT_BELL,
};

export interface DirectorProfile {
  name: string;
  role: string;
  email: string;
  dni: string;
  phone: string;
  specialty: string;
  signatureTitle: string;
  avatarUrl?: string;
}

export const DEFAULT_DIRECTOR_PROFILE: DirectorProfile = {
  name: '',
  role: 'Director(a)',
  email: '',
  dni: '',
  phone: '',
  specialty: '',
  signatureTitle: 'Director(a)',
  avatarUrl: '',
};

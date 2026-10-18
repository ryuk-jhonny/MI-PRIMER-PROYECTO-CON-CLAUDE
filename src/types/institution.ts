export type EducationalLevel = 'inicial' | 'primaria' | 'secundaria';
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
  modularCode?: string;
  modularCodePrimaria: string;
  modularCodeSecundaria: string;
  modularCodeInicial?: string;
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
  doorOpeningTime: string; // e.g. "07:15"
  punctualCutoffTime: string; // e.g. "07:45"
  lateCutoffTime: string; // e.g. "08:15"
  autoWhatsAppNotification: boolean;
  excessiveTardinessAlert: boolean;
  gradeConfigs: GradeSectionConfig[];
  /** Zona horaria usada para decidir Puntual / Tardanza. */
  timeZone?: string;
}

export const DEFAULT_GRADE_CONFIGS: GradeSectionConfig[] = [
  // Primaria
  { gradeId: 'pri-1', gradeName: '1ro Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  { gradeId: 'pri-2', gradeName: '2do Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  { gradeId: 'pri-3', gradeName: '3ro Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  { gradeId: 'pri-4', gradeName: '4to Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  { gradeId: 'pri-5', gradeName: '5to Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  { gradeId: 'pri-6', gradeName: '6to Primaria', level: 'primaria', sections: ['A', 'B'], capacityPerSection: 30, enabled: true },
  
  // Secundaria
  { gradeId: 'sec-1', gradeName: '1ro Secundaria', level: 'secundaria', sections: ['A', 'B'], capacityPerSection: 32, enabled: true },
  { gradeId: 'sec-2', gradeName: '2do Secundaria', level: 'secundaria', sections: ['A', 'B'], capacityPerSection: 32, enabled: true },
  { gradeId: 'sec-3', gradeName: '3ro Secundaria', level: 'secundaria', sections: ['A', 'B'], capacityPerSection: 32, enabled: true },
  { gradeId: 'sec-4', gradeName: '4to Secundaria', level: 'secundaria', sections: ['A', 'B'], capacityPerSection: 32, enabled: true },
  { gradeId: 'sec-5', gradeName: '5to Secundaria', level: 'secundaria', sections: ['A', 'B'], capacityPerSection: 32, enabled: true },
];

export const DEFAULT_INSTITUTION_CONFIG: InstitutionConfig = {
  institutionName: 'Colegio Privado Ryuk',
  shortName: 'Colegio Ryuk',
  modularCodePrimaria: '1482910',
  modularCodeSecundaria: '0743219',
  modularCodeInicial: '1894021',
  localCode: '310452',
  dre: 'DRE Lima Metropolitana',
  ugel: 'UGEL 03 - Cercado',
  directorName: 'Dra. Carmen Mendoza Villena',
  directorDni: '09483210',
  motto: 'Disciplina, Innovación Tecnológica y Excelencia Académica',
  academicYear: '2026',
  shift: 'Mañana',
  activeLevels: ['primaria', 'secundaria'],
  periodType: 'bimestral',
  activePeriod: 'Bimestre II',
  doorOpeningTime: '07:15',
  punctualCutoffTime: '07:45',
  lateCutoffTime: '08:15',
  autoWhatsAppNotification: true,
  excessiveTardinessAlert: true,
  gradeConfigs: DEFAULT_GRADE_CONFIGS,
};

export const PRESET_ONLY_SECUNDARIA: InstitutionConfig = {
  ...DEFAULT_INSTITUTION_CONFIG,
  institutionName: 'Gran Colegio Emblemático Mariscal Cáceres',
  shortName: 'G.U.E. Mariscal Cáceres',
  modularCodePrimaria: '',
  modularCodeSecundaria: '0482918',
  modularCodeInicial: '',
  localCode: '109234',
  dre: 'DRE Ayacucho',
  ugel: 'UGEL Huamanga',
  directorName: 'Dr. Héctor Solís Cárdenas',
  directorDni: '28491023',
  motto: 'Honor, Ciencia y Superación Patriótica',
  academicYear: '2026',
  shift: 'Doble Turno',
  activeLevels: ['secundaria'],
  periodType: 'bimestral',
  activePeriod: 'Bimestre II',
  doorOpeningTime: '07:10',
  punctualCutoffTime: '07:40',
  lateCutoffTime: '08:05',
  autoWhatsAppNotification: true,
  excessiveTardinessAlert: true,
  gradeConfigs: DEFAULT_GRADE_CONFIGS.filter(g => g.level === 'secundaria'),
};

export const PRESET_ONLY_PRIMARIA: InstitutionConfig = {
  ...DEFAULT_INSTITUTION_CONFIG,
  institutionName: 'I.E. Primaria N° 7054 Semillitas del Saber',
  shortName: 'I.E. 7054 Semillitas',
  modularCodePrimaria: '0382911',
  modularCodeSecundaria: '',
  modularCodeInicial: '',
  localCode: '204918',
  dre: 'DRE Arequipa',
  ugel: 'UGEL Arequipa Sur',
  directorName: 'Mg. Rosaura Pérez Luján',
  directorDni: '10294812',
  motto: 'Aprender Jugando con Valores y Alegría',
  academicYear: '2026',
  shift: 'Mañana',
  activeLevels: ['primaria'],
  periodType: 'bimestral',
  activePeriod: 'Bimestre II',
  doorOpeningTime: '07:30',
  punctualCutoffTime: '08:00',
  lateCutoffTime: '08:30',
  autoWhatsAppNotification: true,
  excessiveTardinessAlert: false,
  gradeConfigs: DEFAULT_GRADE_CONFIGS.filter(g => g.level === 'primaria'),
};

export const PRESET_INTEGRAL: InstitutionConfig = {
  ...DEFAULT_INSTITUTION_CONFIG,
  institutionName: 'Complejo Educativo Internacional San Agustín',
  shortName: 'Colegio San Agustín',
  modularCodePrimaria: '1482910',
  modularCodeSecundaria: '0743219',
  modularCodeInicial: '1894021',
  localCode: '310452',
  dre: 'DRE Lima Metropolitana',
  ugel: 'UGEL 07 - San Borja',
  directorName: 'Dra. Carmen Mendoza Villena',
  directorDni: '09483210',
  motto: 'Formando Líderes con Visión Global y Humanista',
  academicYear: '2026',
  shift: 'Mañana',
  activeLevels: ['inicial', 'primaria', 'secundaria'],
  periodType: 'trimestral',
  activePeriod: 'Trimestre I',
  doorOpeningTime: '07:15',
  punctualCutoffTime: '07:45',
  lateCutoffTime: '08:15',
  autoWhatsAppNotification: true,
  excessiveTardinessAlert: true,
  gradeConfigs: [
    { gradeId: 'ini-1', gradeName: 'Inicial 3 Años', level: 'inicial', sections: ['Única'], capacityPerSection: 20, enabled: true },
    { gradeId: 'ini-2', gradeName: 'Inicial 4 Años', level: 'inicial', sections: ['A', 'B'], capacityPerSection: 22, enabled: true },
    { gradeId: 'ini-3', gradeName: 'Inicial 5 Años', level: 'inicial', sections: ['A', 'B'], capacityPerSection: 25, enabled: true },
    ...DEFAULT_GRADE_CONFIGS
  ],
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
  name: 'Dra. Carmen Mendoza Villena',
  role: 'Directora General',
  email: 'direccion@colegio-ryuk.edu.pe',
  dni: '09483210',
  phone: '+51 984 512 340',
  specialty: 'Gestión Educativa & Calidad CNEB',
  signatureTitle: 'Directora General - R.D. N° 0482-2026-UGEL 03',
  avatarUrl: '',
};

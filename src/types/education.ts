export type CnebLiteralGrade = 'AD' | 'A' | 'B' | 'C';

export type CnebArea =
  | 'Matemática'
  | 'Comunicación'
  | 'Ciencia y Tecnología'
  | 'Ciencias Sociales'
  | 'Desarrollo Personal, Ciudadanía y Cívica (DPCC)'
  | 'Educación para el Trabajo (EPT)'
  | 'Inglés'
  | 'Arte y Cultura'
  | 'Educación Física';

export interface CnebRubricDescriptor {
  AD: string;
  A: string;
  B: string;
  C: string;
}

export interface TeacherPortfolioItem {
  id: string;
  category: 'Programación Anual' | 'Unidad de Aprendizaje' | 'Sesión de Aprendizaje' | 'Rúbrica Formativa' | 'Evidencias CNEB';
  cnebArea: CnebArea;
  title: string;
  competency: string;
  capabilities: string[];
  learningPurpose: string;
  performanceCriterion: string;
  evidenceDescription: string;
  evaluationInstrument: string;
  rubric?: CnebRubricDescriptor;
  gradeTarget: string;
  sectionTarget?: string;
  teacherName?: string;
  updatedAt: string;
  status: 'Visado por Dirección' | 'Visado por Coordinación CNEB' | 'En Revisión' | 'Borrador';
  visadoBy?: string;
  visadoDate?: string;
  filesCount: number;
  description: string;
}

export interface StudentCourseGrade {
  courseId: string;
  courseName: string;
  teacherName: string;
  unit1: CnebLiteralGrade | '';
  unit2: CnebLiteralGrade | '';
  unit3: CnebLiteralGrade | '';
  unit4?: CnebLiteralGrade | '';
  average: CnebLiteralGrade | '';
  status: 'Logro Destacado' | 'Logro Esperado' | 'En Proceso' | 'En Inicio' | 'Sin calificar';
  recentFeedback: string;
  /** Calificación por competencia: id de competencia (c1…c31) → literal de cada periodo. */
  comp?: Record<string, (CnebLiteralGrade | '')[]>;
}

export interface AttendanceDay {
  date: string;
  dayName: string;
  status: 'Puntual' | 'Tardanza' | 'Justificada' | 'Inasistencia';
  timeIn?: string;
  verifiedBy: string;
}

export interface Student {
  id: string;
  qrCodeValue: string;
  fullName: string;
  enrollmentCode: string;
  gradeLevel: string;
  section: string;
  avatarUrl: string;
  institutionName: string;
  academicYear: string;
  attendanceRate: number; // e.g. 96.5
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  grades?: StudentCourseGrade[];
  attendanceHistory?: AttendanceDay[];
  dni?: string;
  parentPhone?: string;
  parentName?: string;
  educationalLevel?: 'Primaria' | 'Secundaria';
  justifiedDays?: number;
  /** Código para que el estudiante cree su cuenta. */
  studentCode?: string;
  /** Código para que la familia cree su cuenta. */
  familyCode?: string;
  gender?: 'M' | 'F';
  address?: string;
  birthDate?: string;
}

export interface Teacher {
  id: string;
  name: string;
  gender?: 'M' | 'F';
  dni?: string;
  email?: string;
  phone?: string;
  area: string;
  level: string;
  grades: string;
  portfolioProgress: number;
  rubricsComplete: number;
  rubricsTotal: number;
  status: 'Al día' | 'En proceso' | 'Pendiente';
  lastUpload: string;
  avatarUrl?: string;
  sampleItem?: TeacherPortfolioItem;
}

export interface InstitutionPlan {
  id: string;
  name: string;
  description: string;
  pricePerStudentPerMonth: string;
  studentRange: string;
  features: string[];
  isPopular?: boolean;
}

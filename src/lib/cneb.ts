// =====================================================================
// Currículo Nacional de la Educación Básica (CNEB) · MINEDU Perú
// Áreas, competencias y capacidades de Primaria y Secundaria (EBR).
// Fuente: Programas Curriculares de Educación Primaria y Secundaria (2016).
// =====================================================================

export type Level = 'primaria' | 'secundaria';

export const LEVELS: Level[] = ['primaria', 'secundaria'];
export const LEVEL_LABEL: Record<Level, string> = { primaria: 'Primaria', secundaria: 'Secundaria' };

export interface Competencia {
  /** Número oficial de la competencia en el CNEB (1 a 31). */
  n: number;
  id: string;
  name: string;
  capacidades: string[];
}

const C = (n: number, name: string, capacidades: string[]): Competencia => ({ n, id: `c${n}`, name, capacidades });

const LEE_CAPS = [
  'Obtiene información del texto escrito',
  'Infiere e interpreta información del texto',
  'Reflexiona y evalúa la forma, el contenido y contexto del texto',
];
const ESCRIBE_CAPS = [
  'Adecúa el texto a la situación comunicativa',
  'Organiza y desarrolla las ideas de forma coherente y cohesionada',
  'Utiliza convenciones del lenguaje escrito de forma pertinente',
  'Reflexiona y evalúa la forma, el contenido y contexto del texto escrito',
];
const ORAL_CAPS = [
  'Obtiene información del texto oral',
  'Infiere e interpreta información del texto oral',
  'Adecúa, organiza y desarrolla las ideas de forma coherente y cohesionada',
  'Utiliza recursos no verbales y paraverbales de forma estratégica',
  'Interactúa estratégicamente con distintos interlocutores',
  'Reflexiona y evalúa la forma, el contenido y contexto del texto oral',
];

export const COMPETENCIAS: Record<number, Competencia> = Object.fromEntries(
  [
    C(1, 'Construye su identidad', [
      'Se valora a sí mismo',
      'Autorregula sus emociones',
      'Reflexiona y argumenta éticamente',
      'Vive su sexualidad de manera integral y responsable de acuerdo a su etapa de desarrollo y madurez',
    ]),
    C(2, 'Se desenvuelve de manera autónoma a través de su motricidad', ['Comprende su cuerpo', 'Se expresa corporalmente']),
    C(3, 'Asume una vida saludable', [
      'Comprende las relaciones entre la actividad física, alimentación, postura e higiene personal y del ambiente, y la salud',
      'Incorpora prácticas que mejoran su calidad de vida',
    ]),
    C(4, 'Interactúa a través de sus habilidades sociomotrices', [
      'Se relaciona utilizando sus habilidades sociomotrices',
      'Crea y aplica estrategias y tácticas de juego',
    ]),
    C(5, 'Aprecia de manera crítica manifestaciones artístico-culturales', [
      'Percibe manifestaciones artístico-culturales',
      'Contextualiza manifestaciones artístico-culturales',
      'Reflexiona creativa y críticamente sobre manifestaciones artístico-culturales',
    ]),
    C(6, 'Crea proyectos desde los lenguajes artísticos', [
      'Explora y experimenta los lenguajes del arte',
      'Aplica procesos creativos',
      'Evalúa y comunica sus procesos y proyectos',
    ]),
    C(7, 'Se comunica oralmente en su lengua materna', ORAL_CAPS),
    C(8, 'Lee diversos tipos de textos escritos en su lengua materna', LEE_CAPS),
    C(9, 'Escribe diversos tipos de textos en su lengua materna', ESCRIBE_CAPS),
    C(13, 'Se comunica oralmente en inglés como lengua extranjera', ORAL_CAPS),
    C(14, 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', LEE_CAPS),
    C(15, 'Escribe diversos tipos de textos en inglés como lengua extranjera', ESCRIBE_CAPS),
    C(16, 'Convive y participa democráticamente en la búsqueda del bien común', [
      'Interactúa con todas las personas',
      'Construye normas y asume acuerdos y leyes',
      'Maneja conflictos de manera constructiva',
      'Delibera sobre asuntos públicos',
      'Participa en acciones que promueven el bienestar común',
    ]),
    C(17, 'Construye interpretaciones históricas', [
      'Interpreta críticamente fuentes diversas',
      'Comprende el tiempo histórico',
      'Elabora explicaciones sobre procesos históricos',
    ]),
    C(18, 'Gestiona responsablemente el espacio y el ambiente', [
      'Comprende las relaciones entre los elementos naturales y sociales',
      'Maneja fuentes de información para comprender el espacio geográfico y el ambiente',
      'Genera acciones para conservar el ambiente local y global',
    ]),
    C(19, 'Gestiona responsablemente los recursos económicos', [
      'Comprende las relaciones entre los elementos del sistema económico y financiero',
      'Toma decisiones económicas y financieras',
    ]),
    C(20, 'Indaga mediante métodos científicos para construir sus conocimientos', [
      'Problematiza situaciones para hacer indagación',
      'Diseña estrategias para hacer indagación',
      'Genera y registra datos o información',
      'Analiza datos e información',
      'Evalúa y comunica el proceso y resultados de su indagación',
    ]),
    C(21, 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', [
      'Comprende y usa conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo',
      'Evalúa las implicancias del saber y del quehacer científico y tecnológico',
    ]),
    C(22, 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', [
      'Determina una alternativa de solución tecnológica',
      'Diseña la alternativa de solución tecnológica',
      'Implementa y valida la alternativa de solución tecnológica',
      'Evalúa y comunica el funcionamiento y los impactos de su alternativa de solución tecnológica',
    ]),
    C(23, 'Resuelve problemas de cantidad', [
      'Traduce cantidades a expresiones numéricas',
      'Comunica su comprensión sobre los números y las operaciones',
      'Usa estrategias y procedimientos de estimación y cálculo',
      'Argumenta afirmaciones sobre las relaciones numéricas y las operaciones',
    ]),
    C(24, 'Resuelve problemas de regularidad, equivalencia y cambio', [
      'Traduce datos y condiciones a expresiones algebraicas y gráficas',
      'Comunica su comprensión sobre las relaciones algebraicas',
      'Usa estrategias y procedimientos para encontrar equivalencias y reglas generales',
      'Argumenta afirmaciones sobre relaciones de cambio y equivalencia',
    ]),
    C(25, 'Resuelve problemas de forma, movimiento y localización', [
      'Modela objetos con formas geométricas y sus transformaciones',
      'Comunica su comprensión sobre las formas y relaciones geométricas',
      'Usa estrategias y procedimientos para orientarse en el espacio',
      'Argumenta afirmaciones sobre relaciones geométricas',
    ]),
    C(26, 'Resuelve problemas de gestión de datos e incertidumbre', [
      'Representa datos con gráficos y medidas estadísticas o probabilísticas',
      'Comunica su comprensión de los conceptos estadísticos y probabilísticos',
      'Usa estrategias y procedimientos para recopilar y procesar datos',
      'Sustenta conclusiones o decisiones con base en la información obtenida',
    ]),
    C(27, 'Gestiona proyectos de emprendimiento económico o social', [
      'Crea propuestas de valor',
      'Aplica habilidades técnicas',
      'Trabaja cooperativamente para lograr objetivos y metas',
      'Evalúa los resultados del proyecto de emprendimiento',
    ]),
    C(28, 'Se desenvuelve en entornos virtuales generados por las TIC', [
      'Personaliza entornos virtuales',
      'Gestiona información del entorno virtual',
      'Interactúa en entornos virtuales',
      'Crea objetos virtuales en diversos formatos',
    ]),
    C(29, 'Gestiona su aprendizaje de manera autónoma', [
      'Define metas de aprendizaje',
      'Organiza acciones estratégicas para alcanzar sus metas de aprendizaje',
      'Monitorea y ajusta su desempeño durante el proceso de aprendizaje',
    ]),
    C(30, 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', [
      'Conoce a Dios y asume su identidad religiosa y espiritual como persona digna, libre y trascendente',
      'Cultiva y valora las manifestaciones religiosas de su entorno argumentando su fe de manera comprensible y respetuosa',
    ]),
    C(31, 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa', [
      'Transforma su entorno desde el encuentro personal y comunitario con Dios y desde la fe que profesa',
      'Actúa coherentemente en razón de su fe según los principios de su conciencia moral en situaciones concretas de la vida',
    ]),
  ].map((c) => [c.n, c]),
);

export interface AreaInfo {
  name: string;
  short: string;
  /** Números de competencia por nivel. */
  competencias: Partial<Record<Level, number[]>>;
  /** Color de acento (clases de Tailwind) para la tarjeta del área. */
  tone: string;
  evidencias: string[];
  instrumentos: string[];
  /** Herramienta especializada que se habilita en el panel del docente. */
  tool?: 'fisica';
}

/** Áreas curriculares de Primaria y Secundaria en el orden de la libreta oficial. */
export const AREAS: AreaInfo[] = [
  {
    name: 'Personal Social', short: 'PS', competencias: { primaria: [1, 16, 17, 18, 19] }, tone: 'from-violet-500 to-fuchsia-500',
    evidencias: ['Línea de tiempo', 'Organizador sobre normas de convivencia', 'Croquis de su comunidad', 'Presupuesto familiar sencillo'],
    instrumentos: ['Lista de cotejo', 'Escala de valoración', 'Ficha de observación'],
  },
  {
    name: 'Desarrollo Personal, Ciudadanía y Cívica', short: 'DPCC', competencias: { secundaria: [1, 16] }, tone: 'from-violet-500 to-fuchsia-500',
    evidencias: ['Ensayo argumentativo sobre un dilema ético', 'Proyecto participativo', 'Asamblea de aula con acuerdos'],
    instrumentos: ['Rúbrica', 'Lista de cotejo', 'Escala de valoración'],
  },
  {
    name: 'Ciencias Sociales', short: 'CCSS', competencias: { secundaria: [17, 18, 19] }, tone: 'from-amber-500 to-orange-500',
    evidencias: ['Análisis de fuentes históricas', 'Mapa temático', 'Plan de gestión de riesgos', 'Infografía sobre consumo responsable'],
    instrumentos: ['Rúbrica', 'Lista de cotejo'],
  },
  {
    name: 'Educación Física', short: 'EF', competencias: { primaria: [2, 3, 4], secundaria: [2, 3, 4] }, tone: 'from-emerald-500 to-teal-500', tool: 'fisica',
    evidencias: ['Circuito motriz', 'Registro de condición física (IMC y test)', 'Plan personal de actividad física', 'Juego predeportivo con reglas acordadas'],
    instrumentos: ['Ficha de observación', 'Lista de cotejo', 'Rúbrica'],
  },
  {
    name: 'Comunicación', short: 'COM', competencias: { primaria: [7, 8, 9], secundaria: [7, 8, 9] }, tone: 'from-sky-500 to-blue-600',
    evidencias: ['Exposición oral', 'Ficha de comprensión lectora', 'Texto narrativo, descriptivo o argumentativo', 'Debate'],
    instrumentos: ['Rúbrica', 'Lista de cotejo', 'Escala de valoración'],
  },
  {
    name: 'Arte y Cultura', short: 'AyC', competencias: { primaria: [5, 6], secundaria: [5, 6] }, tone: 'from-pink-500 to-rose-500',
    evidencias: ['Portafolio artístico', 'Presentación musical o teatral', 'Reseña crítica de una manifestación cultural'],
    instrumentos: ['Rúbrica', 'Ficha de observación'],
  },
  {
    name: 'Inglés', short: 'ING', competencias: { primaria: [13, 14, 15], secundaria: [13, 14, 15] }, tone: 'from-indigo-500 to-sky-500',
    evidencias: ['Role play', 'Reading worksheet', 'Short paragraph or e-mail'],
    instrumentos: ['Rúbrica', 'Lista de cotejo'],
  },
  {
    name: 'Matemática', short: 'MAT', competencias: { primaria: [23, 24, 25, 26], secundaria: [23, 24, 25, 26] }, tone: 'from-orange-500 to-amber-400',
    evidencias: ['Resolución de problemas contextualizados', 'Encuesta y gráfico estadístico', 'Maqueta con figuras geométricas'],
    instrumentos: ['Lista de cotejo', 'Rúbrica', 'Prueba escrita'],
  },
  {
    name: 'Ciencia y Tecnología', short: 'CyT', competencias: { primaria: [20, 21, 22], secundaria: [20, 21, 22] }, tone: 'from-lime-500 to-emerald-500',
    evidencias: ['Informe de indagación', 'Prototipo tecnológico', 'Explicación científica argumentada'],
    instrumentos: ['Rúbrica', 'Lista de cotejo', 'Ficha de observación'],
  },
  {
    name: 'Educación para el Trabajo', short: 'EPT', competencias: { secundaria: [27] }, tone: 'from-yellow-500 to-orange-500',
    evidencias: ['Prototipo de producto o servicio', 'Lienzo de propuesta de valor', 'Informe de resultados del proyecto'],
    instrumentos: ['Rúbrica', 'Lista de cotejo'],
  },
  {
    name: 'Educación Religiosa', short: 'ER', competencias: { primaria: [30, 31], secundaria: [30, 31] }, tone: 'from-cyan-500 to-sky-500',
    evidencias: ['Reflexión escrita', 'Proyecto solidario', 'Organizador sobre valores'],
    instrumentos: ['Escala de valoración', 'Lista de cotejo'],
  },
];

/** Competencias transversales que se evalúan desde todas las áreas. */
export const TRANSVERSALES = [28, 29];

export const ENFOQUES_TRANSVERSALES = [
  'Enfoque de derechos',
  'Enfoque inclusivo o de atención a la diversidad',
  'Enfoque intercultural',
  'Enfoque igualdad de género',
  'Enfoque ambiental',
  'Enfoque orientación al bien común',
  'Enfoque búsqueda de la excelencia',
];

export const INSTRUMENTOS = ['Lista de cotejo', 'Rúbrica', 'Escala de valoración', 'Ficha de observación', 'Prueba escrita', 'Portafolio'];

export function areaInfo(name: string): AreaInfo | undefined {
  return AREAS.find((a) => a.name === name);
}

/** Áreas que se dictan en un nivel, en orden oficial. */
export function areasOf(level: Level): string[] {
  return AREAS.filter((a) => a.competencias[level]?.length).map((a) => a.name);
}

/** Competencias de un área en un nivel (vacío si el área no existe en ese nivel). */
export function competenciasOf(area: string, level: Level): Competencia[] {
  return (areaInfo(area)?.competencias[level] || []).map((n) => COMPETENCIAS[n]);
}

/** Todas las áreas de ambos niveles, sin repetir. */
export const ALL_AREAS = AREAS.map((a) => a.name);

export type Ciclo = 'III' | 'IV' | 'V' | 'VI' | 'VII';

export const CICLO_INFO: Record<Ciclo, { level: Level; grados: string }> = {
  III: { level: 'primaria', grados: '1.° y 2.° de primaria' },
  IV: { level: 'primaria', grados: '3.° y 4.° de primaria' },
  V: { level: 'primaria', grados: '5.° y 6.° de primaria' },
  VI: { level: 'secundaria', grados: '1.° y 2.° de secundaria' },
  VII: { level: 'secundaria', grados: '3.°, 4.° y 5.° de secundaria' },
};

/** Ciclo del CNEB a partir del número de grado y el nivel. */
export function cicloOf(grade: number, level: Level): Ciclo {
  if (level === 'primaria') return grade <= 2 ? 'III' : grade <= 4 ? 'IV' : 'V';
  return grade <= 2 ? 'VI' : 'VII';
}

/** Extrae el número de grado de textos como "3ro Primaria", "3.° A" o "Tercero". */
export function gradeNumber(text: string): number {
  const digit = text.match(/\d/);
  if (digit) return Number(digit[0]);
  const words = ['primer', 'segund', 'tercer', 'cuart', 'quint', 'sext'];
  const t = text.toLowerCase();
  const i = words.findIndex((w) => t.includes(w));
  return i >= 0 ? i + 1 : 1;
}

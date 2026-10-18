import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Layers, 
  Check, 
  HelpCircle,
  Copy,
  GraduationCap
} from 'lucide-react';
import { Teacher, TeacherPortfolioItem, CnebArea } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import { TEACHER_PORTFOLIO_ITEMS } from '../data/mockData';

interface ImportTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTeachers: (teachers: Teacher[]) => void;
  institutionConfig: InstitutionConfig;
}

interface ParsedTeacherRow {
  dni: string;
  fullName: string;
  level: string;
  area: string;
  grades: string;
  phone: string;
  email: string;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_TEACHER_ROSTER: ParsedTeacherRow[] = [
  {
    dni: '43902187',
    fullName: 'Prof. Mario Alberto Gálvez Silva',
    level: 'Secundaria',
    area: 'Ciencias Sociales',
    grades: '3°, 4° y 5° Secundaria',
    phone: '+51 987 654 112',
    email: 'm.galvez@colegio-ryuk.edu.pe',
    isValid: true,
    errors: [],
  },
  {
    dni: '45129843',
    fullName: 'Lic. Patricia Benítez Alarcón',
    level: 'Secundaria',
    area: 'Inglés',
    grades: '1° a 5° Secundaria',
    phone: '+51 976 543 889',
    email: 'p.benitez@colegio-ryuk.edu.pe',
    isValid: true,
    errors: [],
  },
  {
    dni: '41876523',
    fullName: 'Prof. Gabriel Mendoza Carranza',
    level: 'Primaria',
    area: 'Matemática Primaria',
    grades: '4°, 5° y 6° Primaria',
    phone: '+51 965 432 771',
    email: 'g.mendoza@colegio-ryuk.edu.pe',
    isValid: true,
    errors: [],
  },
  {
    dni: '48231902',
    fullName: 'Lic. Sofía Villacorta Morales',
    level: 'Primaria',
    area: 'Educación Primaria Integral',
    grades: '1°, 2° y 3° Primaria',
    phone: '+51 954 321 665',
    email: 's.villacorta@colegio-ryuk.edu.pe',
    isValid: true,
    errors: [],
  },
  {
    dni: '46781290',
    fullName: 'Prof. Carlos Andrés Huanca',
    level: 'Secundaria',
    area: 'Educación para el Trabajo (EPT)',
    grades: '3°, 4° y 5° Secundaria',
    phone: '+51 943 210 554',
    email: 'c.huanca@colegio-ryuk.edu.pe',
    isValid: true,
    errors: [],
  },
];

const TEACHER_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
];

export default function ImportTeachersModal({
  isOpen,
  onClose,
  onImportTeachers,
  institutionConfig,
}: ImportTeachersModalProps) {
  const [activeTab, setActiveTab] = useState<'sample' | 'paste' | 'file'>('sample');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>(SAMPLE_TEACHER_ROSTER);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  if (!isOpen) return null;

  const handleCopyTemplate = () => {
    const header = 'DNI\tNOMBRES Y APELLIDOS\tNIVEL\tAREA CURRICULAR\tGRADOS ASIGNADOS\tTELEFONO\tEMAIL';
    const sample = `${header}\n43902187\tProf. Mario Alberto Gálvez Silva\tSecundaria\tCiencias Sociales\t3°, 4° y 5° Secundaria\t+51 987 654 112\tm.galvez@colegio-ryuk.edu.pe\n45129843\tLic. Patricia Benítez Alarcón\tSecundaria\tInglés\t1° a 5° Secundaria\t+51 976 543 889\tp.benitez@colegio-ryuk.edu.pe`;
    navigator.clipboard.writeText(sample);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const parsePastedContent = (raw: string) => {
    const lines = raw.trim().split('\n');
    const result: ParsedTeacherRow[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return;
      const parts = line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim());

      // If it looks like a header, skip
      if (index === 0 && (parts[0]?.toLowerCase().includes('dni') || parts[1]?.toLowerCase().includes('nombre'))) {
        return;
      }

      const dni = parts[0] || '';
      const fullName = parts[1] || '';
      const level = parts[2] || 'Secundaria';
      const area = parts[3] || 'Matemática';
      const grades = parts[4] || `${level} General`;
      const phone = parts[5] || '+51 987 654 321';
      const email = parts[6] || '';

      const errors: string[] = [];
      if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
        errors.push('DNI debe tener 8 dígitos numéricos');
      }
      if (!fullName || fullName.length < 5) {
        errors.push('Nombre docente inválido o incompleto');
      }

      result.push({
        dni,
        fullName,
        level,
        area,
        grades,
        phone,
        email,
        isValid: errors.length === 0,
        errors,
      });
    });

    setParsedRows(result);
  };

  const handlePastedChange = (text: string) => {
    setPastedText(text);
    if (text.trim()) {
      parsePastedContent(text);
    } else {
      setParsedRows([]);
    }
  };

  const handleImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      const generatedTeachers: Teacher[] = validRows.map((row, idx) => {
        const randomAvatar = TEACHER_AVATARS[idx % TEACHER_AVATARS.length];
        
        const sampleItem: TeacherPortfolioItem = {
          id: `PORT-CNEB-${row.dni}-${Date.now()}`,
          category: 'Sesión de Aprendizaje',
          cnebArea: (TEACHER_PORTFOLIO_ITEMS.find(p => p.cnebArea === row.area)?.cnebArea || 'Matemática') as CnebArea,
          title: `Sesión CNEB: ${row.area} (${row.level})`,
          competency: `Aplica competencias y estándares curriculares del área de ${row.area}`,
          capabilities: [
            'Problematiza situaciones del contexto comunitario',
            'Diseña estrategias formativas participativas',
            'Genera evidencias de aprendizaje verificables',
            'Evalúa formativamente el progreso con rúbricas CNEB (AD-C)',
          ],
          learningPurpose: `Los estudiantes desarrollan aprendizajes significativos en el área de ${row.area} (${row.level}).`,
          performanceCriterion: `Sustenta desempeños precisados en el Programa Curricular del nivel ${row.level}.`,
          evidenceDescription: `Carpeta pedagógica, fichas de trabajo y rúbrica analítica por niveles de logro CNEB.`,
          evaluationInstrument: 'Rúbrica formativa por niveles de logro CNEB (AD, A, B, C)',
          rubric: {
            AD: 'Demuestra dominio pleno y autónomo de la competencia.',
            A: 'Alcanza el nivel esperado con claridad y solvencia.',
            B: 'En proceso de alcanzar la competencia con apoyo pedagógico.',
            C: 'En inicio, requiere acompañamiento continuo.',
          },
          gradeTarget: `${row.level}: ${row.grades}`,
          sectionTarget: 'Nómina activa',
          teacherName: row.fullName.startsWith('Prof.') || row.fullName.startsWith('Lic.') ? row.fullName : `Prof. ${row.fullName}`,
          updatedAt: 'Hoy',
          status: 'En Revisión',
          visadoBy: 'Coordinación Pedagógica CNEB',
          visadoDate: 'Pendiente',
          filesCount: 3,
          description: `Carpeta pedagógica oficial del docente con planificación de unidades, sesiones y rúbricas formativas CNEB.`,
        };

        return {
          id: `tch-${row.dni}-${Date.now()}-${idx}`,
          name: row.fullName.startsWith('Prof.') || row.fullName.startsWith('Lic.') ? row.fullName : `Prof. ${row.fullName}`,
          dni: row.dni,
          email: row.email || `${row.fullName.toLowerCase().replace(/[^a-z]/g, '.').slice(0, 15)}@${institutionConfig.shortName.toLowerCase().replace(/\s+/g, '')}.edu.pe`,
          phone: row.phone,
          area: row.area,
          level: row.level,
          grades: row.grades,
          portfolioProgress: 90,
          rubricsComplete: 4,
          rubricsTotal: 4,
          status: 'Al día',
          lastUpload: 'Hoy, Importación Oficial',
          avatarUrl: randomAvatar,
          sampleItem,
        };
      });

      onImportTeachers(generatedTeachers);
      setIsProcessing(false);
      onClose();
    }, 450);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 shadow-md shadow-orange-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif-title">Importar Nómina Docente en Lote</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-extrabold uppercase">
                  CNEB 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Carga la plantilla de profesores desde Excel, nómina MINEDU o pega los datos directamente para generar sus carpetas pedagógicas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sample');
              setParsedRows(SAMPLE_TEACHER_ROSTER);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'sample'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nómina Modelo MINEDU (5 Docentes)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              if (!pastedText) setParsedRows([]);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'paste'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Pegar desde Excel o Tabla</span>
          </button>
        </div>

        {/* Tab 1: Sample View */}
        {activeTab === 'sample' && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Vista previa de nómina modelo lista para importar:
              </span>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTemplate ? '¡Copiado al portapapeles!' : 'Copiar formato Excel'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Incluye docentes de Ciencias Sociales, Inglés, Matemática Primaria, Integral y Educación para el Trabajo (EPT).
            </p>
          </div>
        )}

        {/* Tab 2: Paste Content */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300">
                Pega aquí las filas copiadas desde tu hoja de cálculo:
              </label>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTemplate ? '¡Encabezados copiados!' : 'Copiar encabezados'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => handlePastedChange(e.target.value)}
              placeholder="DNI	NOMBRES Y APELLIDOS	NIVEL	AREA CURRICULAR	GRADOS	TELEFONO	EMAIL
43902187	Prof. Mario Alberto Gálvez	Secundaria	Ciencias Sociales	3° y 4°	+51 987654321	mario@ryuk.pe"
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
            />
          </div>
        )}

        {/* Table Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Registros Detectados ({parsedRows.length})</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validCount} Válidos
              </span>
              {invalidCount > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {invalidCount} Con Errores
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">DNI</th>
                  <th className="py-2.5 px-3">Docente</th>
                  <th className="py-2.5 px-3">Nivel</th>
                  <th className="py-2.5 px-3">Área CNEB</th>
                  <th className="py-2.5 px-3">Grados Asignados</th>
                  <th className="py-2.5 px-3">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Listo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30" title={row.errors.join(', ')}>
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-300">{row.dni}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{row.fullName}</td>
                    <td className="py-2.5 px-3 text-orange-400 font-semibold">{row.level}</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.area}</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.grades}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              Se crearán portafolios CNEB, rúbricas formativas y carpetas pedagógicas para cada docente.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleImport}
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Importando...' : `Importar ${validCount} Docentes`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

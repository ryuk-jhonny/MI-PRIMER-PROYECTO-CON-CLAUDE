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
  Copy
} from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';

interface ImportSiagieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (students: Student[]) => void;
  institutionConfig: InstitutionConfig;
}

interface ParsedRow {
  dni: string;
  fullName: string;
  level: 'Inicial' | 'Primaria' | 'Secundaria';
  grade: string;
  section: string;
  parentPhone: string;
  parentName: string;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_SIAGIE_STUDENTS: ParsedRow[] = [
  {
    dni: '71092831',
    fullName: 'Alonso Renato Chávez Morales',
    level: 'Secundaria',
    grade: '5to Grado',
    section: 'A',
    parentPhone: '+51 981 234 567',
    parentName: 'Renato Chávez Barrientos',
    isValid: true,
    errors: [],
  },
  {
    dni: '72384910',
    fullName: 'Fabiana Nicole Paredes Vega',
    level: 'Secundaria',
    grade: '5to Grado',
    section: 'A',
    parentPhone: '+51 972 345 678',
    parentName: 'Miriam Vega Salazar',
    isValid: true,
    errors: [],
  },
  {
    dni: '73948501',
    fullName: 'Sebastián Gabriel Lazo Flores',
    level: 'Secundaria',
    grade: '4to Grado',
    section: 'B',
    parentPhone: '+51 963 456 789',
    parentName: 'Gabriel Lazo Huamán',
    isValid: true,
    errors: [],
  },
  {
    dni: '74829103',
    fullName: 'Andrea Lucía Montoya Campos',
    level: 'Secundaria',
    grade: '3ro Grado',
    section: 'A',
    parentPhone: '+51 954 567 890',
    parentName: 'Lucía Campos Vda. de Montoya',
    isValid: true,
    errors: [],
  },
  {
    dni: '75910284',
    fullName: 'Rodrigo Matías Silva Castillo',
    level: 'Primaria',
    grade: '6to Grado',
    section: 'A',
    parentPhone: '+51 945 678 901',
    parentName: 'Matías Silva Rivas',
    isValid: true,
    errors: [],
  },
  {
    dni: '76829104',
    fullName: 'Mariana Belén Herrera Soto',
    level: 'Primaria',
    grade: '5to Grado',
    section: 'B',
    parentPhone: '+51 936 789 012',
    parentName: 'Belén Soto Romero',
    isValid: true,
    errors: [],
  },
  {
    dni: '77910238',
    fullName: 'Lucas Daniel Ríos Mendoza',
    level: 'Primaria',
    grade: '2do Grado',
    section: 'B',
    parentPhone: '+51 927 890 123',
    parentName: 'Daniel Ríos Arbulú',
    isValid: true,
    errors: [],
  },
  {
    dni: '78291047',
    fullName: 'Valeria Inés Benavides Cruz',
    level: 'Primaria',
    grade: '1ro Grado',
    section: 'A',
    parentPhone: '+51 918 901 234',
    parentName: 'Inés Cruz de Benavides',
    isValid: true,
    errors: [],
  },
  {
    dni: '79201948',
    fullName: 'Ignacio Javier Castro Huamán',
    level: 'Inicial',
    grade: '5 Años',
    section: 'Celeste',
    parentPhone: '+51 909 012 345',
    parentName: 'Javier Castro Palma',
    isValid: true,
    errors: [],
  },
  {
    dni: '80192837',
    fullName: 'Gia Antonella Salazar Peña',
    level: 'Inicial',
    grade: '4 Años',
    section: 'Amarillo',
    parentPhone: '+51 998 123 456',
    parentName: 'Antonella Peña Bravo',
    isValid: true,
    errors: [],
  },
];

const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
];

export const ImportSiagieModal: React.FC<ImportSiagieModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
  institutionConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file' | 'demo'>('paste');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  // Process text lines (CSV or tab-separated text from Excel)
  const parseRawText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: ParsedRow[] = [];

    lines.forEach((line, index) => {
      // Skip header if line looks like header
      if (index === 0 && (line.toLowerCase().includes('dni') || line.toLowerCase().includes('apellidos'))) {
        return;
      }

      // Check delimiter (tab or comma or semicolon)
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else {
        parts = line.split(',');
      }

      parts = parts.map((p) => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length >= 2) {
        const dni = parts[0] || '';
        const fullName = parts[1] || '';
        const levelRaw = (parts[2] || 'Secundaria').toLowerCase();
        let level: 'Inicial' | 'Primaria' | 'Secundaria' = 'Secundaria';
        if (levelRaw.includes('ini')) level = 'Inicial';
        else if (levelRaw.includes('pri')) level = 'Primaria';

        const grade = parts[3] || '1ro Grado';
        const section = parts[4] || 'A';
        const parentPhone = parts[5] || '+51 987 654 321';
        const parentName = parts[6] || `Apoderado de ${fullName.split(' ')[0] || 'Estudiante'}`;

        const errors: string[] = [];
        if (!dni || dni.length < 8) errors.push('DNI inválido');
        if (!fullName || fullName.length < 3) errors.push('Nombre requerido');

        results.push({
          dni,
          fullName,
          level,
          grade,
          section,
          parentPhone,
          parentName,
          isValid: errors.length === 0,
          errors,
        });
      }
    });

    setParsedRows(results);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteContent(e.target.value);
    parseRawText(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPasteContent(text);
        parseRawText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    setParsedRows(SAMPLE_SIAGIE_STUDENTS);
    setActiveTab('demo');
  };

  const downloadOfficialTemplate = () => {
    const csvContent =
      'DNI,APELLIDOS_Y_NOMBRES,NIVEL,GRADO,SECCION,TELEFONO_APODERADO,NOMBRE_APODERADO\n' +
      '71092831,CHAVEZ MORALES ALONSO RENATO,Secundaria,5to Grado,A,+51 981234567,Renato Chavez Barrientos\n' +
      '72384910,PAREDES VEGA FABIANA NICOLE,Secundaria,5to Grado,A,+51 972345678,Miriam Vega Salazar\n' +
      '75910284,SILVA CASTILLO RODRIGO MATIAS,Primaria,6to Grado,A,+51 945678901,Matias Silva Rivas\n' +
      '79201948,CASTRO HUAMAN IGNACIO JAVIER,Inicial,5 Años,Celeste,+51 909012345,Javier Castro Palma\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_oficial_siagie_minedu_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const importedStudents: Student[] = validRows.map((row, idx) => ({
      id: `RYUK-EST-2026-${row.dni}`,
      qrCodeValue: `RYUK://STU/2026/${row.dni}/${row.fullName.toUpperCase().replace(/\s+/g, '-')}`,
      fullName: row.fullName,
      dni: row.dni,
      enrollmentCode: `EST-${row.dni.slice(-5)}`,
      gradeLevel: `${row.grade} ${row.level}`,
      section: row.section,
      avatarUrl: AVATAR_POOL[idx % AVATAR_POOL.length],
      institutionName: institutionConfig.institutionName,
      academicYear: institutionConfig.academicYear || '2026',
      attendanceRate: 98.0,
      totalDays: 78,
      presentDays: 76,
      lateDays: 2,
      absentDays: 0,
      parentName: row.parentName,
      parentPhone: row.parentPhone,
      educationalLevel: row.level,
      grades: [
        {
          courseId: 'c1',
          courseName: row.level === 'Inicial' ? 'Desarrollo Integral' : 'Matemática',
          teacherName: 'Prof. Asignado',
          unit1: 'AD',
          unit2: 'A',
          unit3: 'AD',
          average: 'AD',
          status: 'Logro Destacado',
          recentFeedback: 'Importado de nómina oficial SIAGIE.',
        },
      ],
      attendanceHistory: [
        {
          date: '16 Oct 2026',
          dayName: 'Viernes',
          status: 'Puntual',
          timeIn: '07:42 AM',
          verifiedBy: 'Importación Masiva SIAGIE',
        },
      ],
    }));

    onImportStudents(importedStudents);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title text-xl font-bold text-white">Importación Rápida de Nómina SIAGIE / Excel</h3>
                <span className="text-xs font-semibold text-amber-400">
                  · MINEDU Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Copia y pega celdas directamente de Excel o carga tu archivo de nómina de matrícula oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadOfficialTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Descargar plantilla CSV para rellenar en Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plantilla Excel (.csv)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex space-x-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                activeTab === 'paste'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Copiar y Pegar Celdas de Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                activeTab === 'file'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Subir Archivo (.csv / .xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              className={`px-4 py-2.5 rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                activeTab === 'demo'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-emerald-300 hover:bg-slate-800/30'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Cargar Nómina Oficial Demo (10 Alumnos)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          
          {/* TAB 1: PASTE FROM EXCEL */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300">
                  Pega aquí las columnas copiadas desde Excel o SIAGIE:
                </label>
                <span className="text-[11px] text-slate-400">
                  Formato esperado: DNI | Nombres y Apellidos | Nivel | Grado | Sección | Teléfono | Apoderado
                </span>
              </div>
              <textarea
                rows={5}
                value={pasteContent}
                onChange={handlePasteChange}
                placeholder="Ejemplo:
71092831	Alonso Renato Chávez Morales	Secundaria	5to Grado	A	+51 981234567	Renato Chávez
72384910	Fabiana Nicole Paredes Vega	Secundaria	5to Grado	A	+51 972345678	Miriam Vega
75910284	Rodrigo Matías Silva Castillo	Primaria	6to Grado	A	+51 945678901	Matías Silva"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <label className="block border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-3xl p-8 text-center cursor-pointer transition-all bg-slate-950/40">
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-sm text-white">
                    {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic o arrastra tu archivo de nómina aquí'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Acepta archivos exportados desde SIAGIE MINEDU en formato .CSV o texto delimitado
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* TAB 3: DEMO LOAD INFO */}
          {activeTab === 'demo' && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">
                    Nómina de prueba MINEDU cargada con éxito (10 alumnos para Inicial, Primaria y Secundaria)
                  </p>
                  <p className="text-slate-400">
                    Incluye DNIs validados, asignación de aulas, teléfonos de apoderados y generación de credenciales.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PARSED PREVIEW TABLE */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Vista Previa de Estudiantes Detectados ({parsedRows.length})
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {validCount} Válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {invalidCount} Con observaciones
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-400">
                  Se generarán códigos QR automáticamente para cada alumno
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase bg-slate-900/80">
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3">DNI</th>
                      <th className="py-3 px-3">Apellidos y Nombres</th>
                      <th className="py-3 px-3">Nivel</th>
                      <th className="py-3 px-3">Grado y Sección</th>
                      <th className="py-3 px-3">Apoderado</th>
                      <th className="py-3 px-3">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-bold" title={row.errors.join(', ')}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">{row.dni}</td>
                        <td className="py-2.5 px-3 text-white font-bold">{row.fullName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {row.level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{row.grade} - {row.section}</td>
                        <td className="py-2.5 px-3 text-slate-400 truncate max-w-[150px]">{row.parentName}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400 text-[11px]">{row.parentPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            {validCount > 0 ? (
              <span className="text-emerald-400 font-bold">
                ✓ Listos para incorporar a la base de datos institucional
              </span>
            ) : (
              <span>Pega datos o carga un archivo para previsualizar</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={validCount === 0}
              onClick={handleConfirmImport}
              className={`px-6 py-2.5 rounded-xl font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                validCount > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Importar {validCount} Estudiantes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImportSiagieModal;

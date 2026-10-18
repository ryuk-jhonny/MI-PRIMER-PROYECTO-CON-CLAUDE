import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Award, 
  GraduationCap, 
  Calendar, 
  User, 
  Building2,
  FileText
} from 'lucide-react';
import { Student } from '../types/education';

interface OfficialGradeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export default function OfficialGradeReportModal({
  isOpen,
  onClose,
  student,
}: OfficialGradeReportModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (student) {
      QRCode.toDataURL(student.qrCodeValue, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrUrl).catch(console.error);
    }
  }, [student]);

  if (!isOpen) return null;

  const cnebScores: Record<string, number> = { AD: 4, A: 3, B: 2, C: 1 };
  const studentGrades = student.grades || [];
  const totalScore = studentGrades.reduce((acc, curr) => acc + (cnebScores[curr.average] || 3), 0);
  const avgScore = studentGrades.length > 0 ? totalScore / studentGrades.length : 3;
  const generalGrade = avgScore >= 3.4 ? 'AD (Logro Destacado)' : avgScore >= 2.4 ? 'A (Logro Esperado)' : 'B (En Proceso)';

  const handleSimulatePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Boleta Oficial de Calificaciones en Tiempo Real</h3>
              <p className="text-[11px] text-slate-400">Sistema Institucional Ryuk · Validez Académica Digital</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulatePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body (Document Style) */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Institution & Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-widest block">
                MINISTERIO DE EDUCACIÓN · REPORTE OFICIAL RYUK
              </span>
              <h2 className="text-xl sm:text-2xl font-serif-title font-bold text-slate-900">
                {student.institutionName}
              </h2>
              <p className="text-xs text-slate-500">
                Resolución Directoral N° 0482-2026 · Código Modular: 0382918
              </p>
            </div>

            <div className="text-left sm:text-right bg-slate-50 p-3 rounded-2xl border border-slate-200 sm:min-w-[180px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Año Lectivo 2026
              </span>
              <span className="text-sm font-bold text-slate-800 block">
                Bimestre III en Curso
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center sm:justify-end gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sincronizado en Vivo
              </span>
            </div>
          </div>

          {/* Student Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Estudiante</span>
              <span className="font-bold text-slate-900">{student.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Código de Matrícula</span>
              <span className="font-mono font-bold text-blue-600">{student.enrollmentCode}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Nivel y Grado</span>
              <span className="font-medium text-slate-800">{student.gradeLevel} (Sec. {student.section})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Asistencia Global</span>
              <span className="font-bold text-emerald-600 tabular-nums">{student.attendanceRate}% ({student.presentDays}/{student.totalDays} días)</span>
            </div>
          </div>

          {/* Grades Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Área Curricular</th>
                  <th className="py-3 px-3 text-center">Unidad 1</th>
                  <th className="py-3 px-3 text-center">Unidad 2</th>
                  <th className="py-3 px-3 text-center">Unidad 3 (Actual)</th>
                  <th className="py-3 px-4 text-center">Promedio</th>
                  <th className="py-3 px-4 text-center">Nivel de Logro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentGrades.map((grade) => (
                  <tr key={grade.courseId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{grade.courseName}</span>
                      <span className="text-[10px] text-slate-400">{grade.teacherName}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-600">
                      {grade.unit1}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-600">
                      {grade.unit2}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-blue-600 bg-blue-50/50">
                      {grade.unit3}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums font-extrabold text-sm text-slate-900">
                      {grade.average}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        grade.average === 'AD' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : grade.average === 'A'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {grade.average === 'AD' ? 'AD - Destacado' : grade.average === 'A' ? 'A - Esperado' : 'B - En Proceso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary KPI Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider block">
                  Nivel de Logro Ponderado General del Estudiante
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-serif-title font-extrabold text-slate-900">
                    {generalGrade}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">(Currículo Nacional CNEB)</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Condición: Rendimiento Destacado
              </span>
            </div>
          </div>

          {/* Validation & Electronic QR Stamp */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Validación" className="w-16 h-16 rounded-lg border border-slate-200 shadow-xs" />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded-lg" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block text-[11px]">Validación Criptográfica Ryuk</span>
                <span className="text-[10px] font-mono block">Firma SHA-256: 7d9a-01c4-ryuk-2026-eval</span>
                <span className="text-[10px] text-slate-400 block">Consulta pública escaneando con la cámara del smartphone</span>
              </div>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="w-36 h-10 border-b border-slate-400 mx-auto sm:ml-auto mb-1 flex items-end justify-center">
                <span className="font-serif-title italic text-[11px] text-slate-600">Firma Digital Visada</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Dirección Académica Institucional</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Los cambios de notas hechos por el docente en el simulador se reflejan aquí en tiempo real.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Boleta
          </button>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, 
  QrCode, 
  CalendarCheck2, 
  GraduationCap, 
  FolderCheck, 
  CheckCircle2, 
  Clock, 
  FileCheck2, 
  Sparkles, 
  RefreshCw, 
  School, 
  TrendingUp, 
  AlertTriangle,
  Send,
  Building2,
  ChevronRight,
  BookOpen,
  Eye,
  Award,
  Filter,
  ShieldCheck,
  Check,
  Layers
} from 'lucide-react';
import { INITIAL_STUDENTS, TEACHER_PORTFOLIO_ITEMS, CNEB_AREAS } from '../data/landingSamples';
import { Student, CnebLiteralGrade, StudentCourseGrade, TeacherPortfolioItem, CnebArea } from '../types/education';
import OfficialGradeReportModal from './OfficialGradeReportModal';
import CnebPortfolioModal from './CnebPortfolioModal';

const CNEB_SCORES: Record<CnebLiteralGrade, number> = {
  AD: 4,
  A: 3,
  B: 2,
  C: 1,
};

const SCORE_TO_CNEB = (score: number): CnebLiteralGrade => {
  if (score >= 3.4) return 'AD';
  if (score >= 2.4) return 'A';
  if (score >= 1.4) return 'B';
  return 'C';
};

const CNEB_STATUS = (grade: CnebLiteralGrade): StudentCourseGrade['status'] => {
  if (grade === 'AD') return 'Logro Destacado';
  if (grade === 'A') return 'Logro Esperado';
  if (grade === 'B') return 'En Proceso';
  return 'En Inicio';
};

interface InteractiveSimulatorProps {
  activeTab?: 'student-mobile' | 'teacher-portfolio' | 'director-console';
  studentMobileView?: 'qr-card' | 'attendance' | 'grades';
  onTabChange?: (tab: 'student-mobile' | 'teacher-portfolio' | 'director-console') => void;
  onStudentViewChange?: (view: 'qr-card' | 'attendance' | 'grades') => void;
  onOpenDirectorConsole?: () => void;
}

export default function InteractiveSimulator({
  activeTab: propActiveTab,
  studentMobileView: propStudentView,
  onTabChange,
  onStudentViewChange,
  onOpenDirectorConsole,
}: InteractiveSimulatorProps = {}) {
  const [internalActiveTab, setInternalActiveTab] = useState<'student-mobile' | 'teacher-portfolio' | 'director-console'>('student-mobile');
  const [internalStudentMobileView, setInternalStudentMobileView] = useState<'qr-card' | 'attendance' | 'grades'>('qr-card');
  const [isGradeReportModalOpen, setIsGradeReportModalOpen] = useState<boolean>(false);

  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'student-mobile' | 'teacher-portfolio' | 'director-console') => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  const studentMobileView = propStudentView !== undefined ? propStudentView : internalStudentMobileView;
  const setStudentMobileView = (view: 'qr-card' | 'attendance' | 'grades') => {
    setInternalStudentMobileView(view);
    onStudentViewChange?.(view);
  };
  
  // Student State
  const [studentsList, setStudentsList] = useState<Student[]>(INITIAL_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(INITIAL_STUDENTS[0].id);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // Teacher State for live editing
  const selectedStudent = studentsList.find(s => s.id === selectedStudentId) || studentsList[0];
  const [selectedCourseId, setSelectedCourseId] = useState<string>(selectedStudent.grades?.[0]?.courseId || 'c1');
  const [editGradeValue, setEditGradeValue] = useState<CnebLiteralGrade>('AD');
  const [gradeUpdatedNotification, setGradeUpdatedNotification] = useState<boolean>(false);

  // CNEB Teacher Portfolio State
  const [selectedCnebAreaFilter, setSelectedCnebAreaFilter] = useState<string>('TODAS');
  const [selectedPortfolioItemForModal, setSelectedPortfolioItemForModal] = useState<TeacherPortfolioItem | null>(null);
  const [isCnebModalOpen, setIsCnebModalOpen] = useState<boolean>(false);

  const filteredPortfolioItems = selectedCnebAreaFilter === 'TODAS'
    ? TEACHER_PORTFOLIO_ITEMS
    : TEACHER_PORTFOLIO_ITEMS.filter(item => item.cnebArea === selectedCnebAreaFilter);

  // Generate QR Code dynamically when student changes
  useEffect(() => {
    QRCode.toDataURL(selectedStudent.qrCodeValue, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [selectedStudent.qrCodeValue]);

  // Handle simulated QR scanning at the school gate
  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanSuccessMessage(null);

    setTimeout(() => {
      setIsScanning(false);
      const currentTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      // Add or update today's attendance in state
      setStudentsList(prev => prev.map(student => {
        if (student.id === selectedStudent.id) {
          const newHistory = [
            {
              date: 'Hoy (16 Oct 2026)',
              dayName: 'En Vivo',
              status: 'Puntual' as const,
              timeIn: `${currentTime}`,
              verifiedBy: 'Escáner QR Ryuk - Puerta Principal'
            },
            ...(student.attendanceHistory || []).filter(h => h.dayName !== 'En Vivo')
          ];
          return {
            ...student,
            presentDays: student.presentDays + 1,
            attendanceHistory: newHistory
          };
        }
        return student;
      }));

      setScanSuccessMessage(`¡Asistencia Validada! ${selectedStudent.fullName} registrada a las ${currentTime}`);
      
      // Auto clear message after 4s
      setTimeout(() => setScanSuccessMessage(null), 4500);
    }, 900);
  };

  // Handle live grade update from teacher tab
  const handleTeacherSaveGrade = () => {
    setStudentsList(prev => prev.map(student => {
      if (student.id === selectedStudent.id) {
        const updatedGrades = (student.grades || []).map(g => {
          if (g.courseId === selectedCourseId) {
            const avgScore = ((g.unit1 ? CNEB_SCORES[g.unit1] : 3) + (g.unit2 ? CNEB_SCORES[g.unit2] : 3) + CNEB_SCORES[editGradeValue]) / 3;
            const newAvg = SCORE_TO_CNEB(avgScore);
            return {
              ...g,
              unit3: editGradeValue,
              average: newAvg,
              status: CNEB_STATUS(newAvg)
            };
          }
          return g;
        });
        return { ...student, grades: updatedGrades };
      }
      return student;
    }));

    setGradeUpdatedNotification(true);
    setTimeout(() => setGradeUpdatedNotification(false), 3500);
  };

  return (
    <section id="simulador" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] text-orange-400 uppercase">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>SIMULADOR INTERACTIVO EN VIVO</span>
          </div>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight [text-wrap:balance]">
            Experimenta el Sistema Ryuk desde Cualquier Rol
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Interactúa en vivo con el carnet QR y portal móvil del estudiante, la consola pedagógica docente y el panel de dirección institucional.
          </p>

          {/* Role selector tabs */}
          <div className="inline-flex p-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 mt-4 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('student-mobile')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'student-mobile'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Portal Móvil del Estudiante (QR)</span>
            </button>

            <button
              onClick={() => setActiveTab('teacher-portfolio')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'teacher-portfolio'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderCheck className="w-4 h-4" />
              <span>Portafolio del Docente</span>
            </button>

            <button
              onClick={() => setActiveTab('director-console')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'director-console'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <School className="w-4 h-4" />
              <span>Consola de Dirección</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            ROLE 1: PORTAL MÓVIL DEL ESTUDIANTE CON ACCESO QR
           ========================================================================= */}
        {activeTab === 'student-mobile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls & Context (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-400" />
                    Seleccionar Alumno de Prueba
                  </h3>
                  <span className="text-xs text-slate-400">3 perfiles activos</span>
                </div>

                <div className="space-y-2">
                  {studentsList.map((stu) => (
                    <button
                      key={stu.id}
                      onClick={() => setSelectedStudentId(stu.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        selectedStudent.id === stu.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={stu.avatarUrl}
                        alt={stu.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{stu.fullName}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {stu.gradeLevel} · Sec. {stu.section}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">
                          {stu.attendanceRate}%
                        </span>
                        <span className="block text-[10px] text-slate-400">Asistencia</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Direct View Switcher for the Student Phone */}
                <div className="pt-3 border-t border-slate-700 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Pantalla activa en el móvil:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80">
                    <button
                      onClick={() => setStudentMobileView('qr-card')}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        studentMobileView === 'qr-card'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Carnet QR
                    </button>
                    <button
                      onClick={() => setStudentMobileView('attendance')}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        studentMobileView === 'attendance'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Asistencia
                    </button>
                    <button
                      onClick={() => setStudentMobileView('grades')}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        studentMobileView === 'grades'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Notas en Vivo
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700 space-y-3">
                  <span className="text-xs font-medium text-slate-300 block">
                    Acción de prueba de lector óptico institucional:
                  </span>
                  <button
                    onClick={handleSimulateScan}
                    disabled={isScanning}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Escaneando carnet QR en lector de puerta...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>Simular Escaneo de Entrada con QR</span>
                      </>
                    )}
                  </button>

                  {scanSuccessMessage && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{scanSuccessMessage}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Al escanear el QR, la asistencia se registra instantáneamente en la base de datos de la institución y notifica al instante a los dispositivos móviles de los estudiantes y apoderados.
                  </p>
                </div>
              </div>

              {/* Explanatory callout */}
              <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-900/60 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Acceso Móvil Seguro Sin Contraseñas
                </span>
                <p>
                  El estudiante o padre solo necesita enfocar el código QR institucional de su credencial para ingresar a su reporte actualizado en tiempo real, garantizando máxima velocidad y cero contraseñas olvidadas.
                </p>
              </div>
            </div>

            {/* Right: Realistic Phone Viewport (Span 7) */}
            <div id="simulador-phone" className="lg:col-span-7 flex justify-center scroll-mt-28">
              {/* Smartphone Frame */}
              <div className="w-full max-w-[380px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-[4px] border-slate-700/80 relative">
                {/* Speaker & Dynamic Island */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full flex items-center justify-center gap-2 z-20">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-900/40" />
                </div>

                {/* Inner Mobile Screen */}
                <div className="bg-slate-900 rounded-[34px] overflow-hidden text-slate-100 min-h-[580px] flex flex-col justify-between border border-slate-800 relative">
                  
                  {/* Mobile Top Bar */}
                  <div className="pt-6 px-4 pb-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <GraduationCap className="w-4 h-4" />
                      <span>Ryuk Portal Móvil</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">16 Oct 2026</span>
                  </div>

                  {/* Student Quick Profile Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center gap-3">
                    <img
                      src={selectedStudent.avatarUrl}
                      alt={selectedStudent.fullName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{selectedStudent.fullName}</h4>
                      <p className="text-[11px] text-blue-300 truncate">
                        {selectedStudent.gradeLevel} ({selectedStudent.section})
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Cód: {selectedStudent.enrollmentCode}
                      </span>
                    </div>
                  </div>

                  {/* Mobile View Switcher (Carnet QR / Asistencia / Notas) */}
                  <div className="grid grid-cols-3 p-1.5 bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold text-center">
                    <button
                      onClick={() => setStudentMobileView('qr-card')}
                      className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                        studentMobileView === 'qr-card' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Carnet QR
                    </button>
                    <button
                      onClick={() => setStudentMobileView('attendance')}
                      className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                        studentMobileView === 'attendance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Asistencia
                    </button>
                    <button
                      onClick={() => setStudentMobileView('grades')}
                      className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                        studentMobileView === 'grades' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Notas en Vivo
                    </button>
                  </div>

                  {/* Mobile Body Content Area */}
                  <div className="p-4 flex-1 overflow-y-auto no-scrollbar max-h-[380px]">
                    {/* View 1: Digital QR Card */}
                    {studentMobileView === 'qr-card' && (
                      <div className="space-y-4">
                        <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-lg border border-slate-200 text-center relative overflow-hidden">
                          {/* Laser scanning visual bar effect when active */}
                          {isScanning && (
                            <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-bounce top-1/2 -translate-y-1/2 z-10" />
                          )}

                          <div className="flex items-center justify-between text-left pb-2 mb-2 border-b border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
                                Credencial Digital Estudiantil
                              </span>
                              <span className="text-xs font-bold text-slate-800">{selectedStudent.institutionName}</span>
                            </div>
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                          </div>

                          {/* Dynamic Authentic QR Code */}
                          <div className="flex justify-center my-2">
                            {qrDataUrl ? (
                              <img
                                src={qrDataUrl}
                                alt="Código QR Institucional"
                                className="w-44 h-44 rounded-lg border border-slate-100 shadow-xs"
                              />
                            ) : (
                              <div className="w-44 h-44 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                Generando QR...
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-900 block">{selectedStudent.fullName}</span>
                            <span className="text-[11px] font-mono text-slate-500">{selectedStudent.enrollmentCode}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center text-xs space-y-1">
                          <span className="text-slate-300 block font-medium">Estado de Acceso:</span>
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Credencial Activa y Homologada 2026
                          </span>
                        </div>
                      </div>
                    )}

                    {/* View 2: Real-time Attendance */}
                    {studentMobileView === 'attendance' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              % Asistencia
                            </span>
                            <span className="text-xl font-bold text-emerald-400 tabular-nums">
                              {selectedStudent.attendanceRate}%
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              Días Asistidos
                            </span>
                            <span className="text-xl font-bold text-white tabular-nums">
                              {selectedStudent.presentDays}/{selectedStudent.totalDays}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-300 block mb-2">
                            Registro Cronológico de Ingreso
                          </span>
                          <div className="space-y-2">
                            {(selectedStudent.attendanceHistory || []).map((log, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{log.date}</span>
                                    <span className="text-slate-400 text-[10px]">({log.dayName})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">{log.verifiedBy}</div>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      log.status === 'Puntual'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : log.status === 'Tardanza'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                    {log.timeIn}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* View 3: Real-time Grades */}
                    {studentMobileView === 'grades' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className="text-xs font-bold text-slate-300">Libreta Bimestral en Vivo</span>
                          <span className="text-[11px] font-mono text-blue-400">Escala Oficial (0-20)</span>
                        </div>

                        {/* Live Sync Banner */}
                        <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-[11px] text-orange-200 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                            Calificaciones en Tiempo Real
                          </span>
                          <span className="text-[10px] bg-orange-500/20 px-2 py-0.5 rounded text-orange-300 font-mono font-bold">
                            Bimestre III
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(selectedStudent.grades || []).map((grade) => (
                            <div
                              key={grade.courseId}
                              className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5 hover:border-orange-500/40 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{grade.courseName}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    grade.average === 'AD' 
                                      ? 'bg-emerald-500/20 text-emerald-300' 
                                      : grade.average === 'A' 
                                      ? 'bg-blue-500/20 text-blue-300' 
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {grade.status}
                                  </span>
                                  <span className="text-sm font-extrabold text-emerald-400 tabular-nums font-mono">
                                    {grade.average}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>{grade.teacherName}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span>U1: {grade.unit1}</span>
                                  <span>·</span>
                                  <span>U2: {grade.unit2}</span>
                                  <span>·</span>
                                  <span className="text-blue-300 font-bold bg-blue-900/40 px-1 rounded">U3: {grade.unit3}</span>
                                </div>
                              </div>
                              {grade.recentFeedback && (
                                <p className="text-[10px] text-slate-300 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 italic">
                                  "{grade.recentFeedback}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Open Complete Official Transcript Modal */}
                        <button
                          onClick={() => setIsGradeReportModalOpen(true)}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>Ver Boleta Oficial Completa (PDF)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile Footer Navigation Bar */}
                  <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
                    Sincronizado vía nube segura · Sistema Institucional Ryuk
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ROLE 2: PORTAFOLIO DOCENTE DIGITAL Y GESTIÓN DE NOTAS
           ========================================================================= */}
        {/* =========================================================================
            ROLE 2: PORTAFOLIO DOCENTE DIGITAL Y GESTIÓN DE NOTAS CNEB
           ========================================================================= */}
        {activeTab === 'teacher-portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Portafolio Documents and Curricular Sessions by CNEB Areas (Span 7) */}
            <div className="lg:col-span-7 bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      CNEB 2026 · Primaria y Secundaria
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                    <FolderCheck className="w-5 h-5 text-blue-400" />
                    Portafolio Docente y Carpeta Pedagógica CNEB
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estructurado por Áreas Curriculares Oficiales del Currículo Nacional de la Educación Básica.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 self-start sm:self-auto flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Visado CNEB 100% al Día
                </span>
              </div>

              {/* CNEB Areas Filter Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-orange-400" />
                    Filtrar por Área Curricular CNEB:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {filteredPortfolioItems.length} dossier{filteredPortfolioItems.length !== 1 ? 's' : ''} pedagógico{filteredPortfolioItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedCnebAreaFilter('TODAS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                      selectedCnebAreaFilter === 'TODAS'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Todas las Áreas ({TEACHER_PORTFOLIO_ITEMS.length})
                  </button>
                  {CNEB_AREAS.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setSelectedCnebAreaFilter(area.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                        selectedCnebAreaFilter === area.id
                          ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                          : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${area.colorBg.replace('/10', '')} bg-current`} />
                      <span>{area.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Portfolio Dossier Cards */}
              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredPortfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3 hover:border-slate-500 transition-all group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {item.cnebArea}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* CNEB Competency Highlight Box */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-start gap-1.5 text-slate-300">
                        <BookOpen className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-white">Competencia CNEB:</span>
                        <span className="text-slate-300">{item.competency}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 pl-5">
                        <strong className="text-slate-300">Propósito:</strong> {item.learningPurpose}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-300 font-medium">{item.gradeTarget}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>{item.teacherName}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPortfolioItemForModal(item);
                          setIsCnebModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs border border-blue-500/40 transition-all cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Estructura CNEB y Rúbrica</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live Grade Editor for Students with CNEB Focus (Span 5) */}
            <div className="lg:col-span-5 bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Evaluación Formativa CNEB
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Registro de Calificaciones CNEB
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica la calificación por niveles de logro oficial y comprueba la sincronización instantánea en el móvil del estudiante.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Estudiante a Evaluar:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-medium cursor-pointer"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Área Curricular CNEB / Asignatura:
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      const targetG = selectedStudent.grades?.find(g => g.courseId === e.target.value);
                      if (targetG) setEditGradeValue(targetG.unit3 || 'A');
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-medium cursor-pointer"
                  >
                    {(selectedStudent.grades || []).map((g) => (
                      <option key={g.courseId} value={g.courseId}>
                        {g.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Nivel de Logro Formativo (Unidad 3 - CNEB):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['AD', 'A', 'B', 'C'] as CnebLiteralGrade[]).map((cVal) => (
                      <button
                        key={cVal}
                        type="button"
                        onClick={() => setEditGradeValue(cVal)}
                        className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                          editGradeValue === cVal
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.02]'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {cVal}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 font-medium mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span><strong className="text-purple-400">AD:</strong> Logro Destacado</span>
                    <span><strong className="text-blue-400">A:</strong> Logro Esperado</span>
                    <span><strong className="text-amber-400">B:</strong> En Proceso</span>
                    <span><strong className="text-rose-400">C:</strong> En Inicio</span>
                  </div>
                </div>

                <button
                  onClick={handleTeacherSaveGrade}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar Nota y Notificar en Tiempo Real</span>
                </button>

                {gradeUpdatedNotification && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">¡Nota guardada y sincronizada en tiempo real!</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('student-mobile');
                        setStudentMobileView('grades');
                        setTimeout(() => {
                          const el = document.getElementById('simulador-phone');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Ver Calificación en el Celular del Alumno</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/60 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">Visado Automático:</span>
                <p>
                  Cada acta de calificaciones cuenta con trazabilidad blockchain e histórico de modificaciones para evitar alteraciones no autorizadas de notas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ROLE 3: CONSOLA DE DIRECCIÓN INSTITUCIONAL
           ========================================================================= */}
        {activeTab === 'director-console' && (
          <div className="space-y-6">
            {/* Direct access to full Director Console */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-slate-900 border border-orange-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-md shadow-orange-500/20 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <School className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white font-serif-title">
                      Demo de Consola de Dirección Institucional
                    </h4>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 uppercase tracking-wider">
                      Interactivo
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Explora el Tablero Ejecutivo, Gestor de Estudiantes, Supervisión y Registro de Docentes, Monitoreo QR y Actas SIAGIE.
                  </p>
                </div>
              </div>

              {onOpenDirectorConsole && (
                <button
                  type="button"
                  onClick={onOpenDirectorConsole}
                  className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-auto shrink-0"
                >
                  <span>Ingresar a Consola Completa</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Estudiantes Matriculados</span>
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-extrabold text-white tabular-nums">1,248</div>
                <span className="text-[11px] text-emerald-400 font-medium">100% con credencial QR</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Asistencia Promedio Hoy</span>
                  <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">98.1%</div>
                <span className="text-[11px] text-slate-400">1,224 presentes a las 08:00 AM</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Portafolios Docentes</span>
                  <FolderCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-extrabold text-white tabular-nums">54 / 56</div>
                <span className="text-[11px] text-blue-400 font-medium">96.4% visados a tiempo</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Alertas de Deserción</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-amber-400 tabular-nums">03</div>
                <span className="text-[11px] text-slate-400">Seguimiento psicopedagógico</span>
              </div>
            </div>

            {/* School Campus Status Table */}
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-base font-bold text-white mb-4">
                Consolidado de Asistencia y Portafolios por Grado Escolar
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-bold">Grado y Nivel</th>
                      <th className="py-3 px-4 font-bold">Alumnos</th>
                      <th className="py-3 px-4 font-bold">Asistencia Hoy</th>
                      <th className="py-3 px-4 font-bold">Portafolio Docente</th>
                      <th className="py-3 px-4 font-bold">Alertas</th>
                      <th className="py-3 px-4 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">5to de Secundaria (A, B, C)</td>
                      <td className="py-3 px-4 text-slate-300 tabular-nums">92</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">98.9% (QR OK)</td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">100% Visado</td>
                      <td className="py-3 px-4 text-slate-400">0</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1 cursor-pointer">
                          Ver Acta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">4to de Secundaria (A, B, C)</td>
                      <td className="py-3 px-4 text-slate-300 tabular-nums">96</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">97.2% (QR OK)</td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">100% Visado</td>
                      <td className="py-3 px-4 text-amber-400 font-medium">1 tardanza recurrente</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1 cursor-pointer">
                          Ver Acta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">3ro de Secundaria (A, B, C)</td>
                      <td className="py-3 px-4 text-slate-300 tabular-nums">88</td>
                      <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">99.1% (QR OK)</td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">100% Visado</td>
                      <td className="py-3 px-4 text-slate-400">0</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1 cursor-pointer">
                          Ver Acta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Official Grade Report Document Modal */}
      <OfficialGradeReportModal
        isOpen={isGradeReportModalOpen}
        onClose={() => setIsGradeReportModalOpen(false)}
        student={selectedStudent}
      />

      {/* CNEB Teacher Portfolio Dossier Modal */}
      <CnebPortfolioModal
        isOpen={isCnebModalOpen}
        onClose={() => setIsCnebModalOpen(false)}
        item={selectedPortfolioItemForModal}
      />
    </section>
  );
}

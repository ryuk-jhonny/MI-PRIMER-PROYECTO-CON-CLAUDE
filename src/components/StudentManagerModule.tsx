import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  QrCode, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Printer, 
  Download, 
  Trash2, 
  GraduationCap, 
  School, 
  ExternalLink,
  Sparkles,
  TrendingUp,
  Clock,
  IdCard,
  MessageCircle,
  ChevronDown,
  RotateCcw,
  X,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import AddStudentModal from './AddStudentModal';
import ImportSiagieModal from './ImportSiagieModal';
import StudentCarnetModal from './StudentCarnetModal';

interface StudentManagerModuleProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onImportStudents: (students: Student[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onClearAllStudents?: () => void;
  onLoadDemoStudentsForLevel?: () => void;
  institutionConfig: InstitutionConfig;
  onSelectStudentForScanTest?: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
}

export const StudentManagerModule: React.FC<StudentManagerModuleProps> = ({
  students,
  onAddStudent,
  onImportStudents,
  onDeleteStudent,
  onClearAllStudents,
  onLoadDemoStudentsForLevel,
  institutionConfig,
  onSelectStudentForScanTest,
  onEditStudent,
}) => {
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [carnetModalOpen, setCarnetModalOpen] = useState(false);
  const [selectedStudentForCarnet, setSelectedStudentForCarnet] = useState<Student | null>(null);
  const [clearConfirmModalOpen, setClearConfirmModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'high' | 'risk'>('all');

  const activeLevels = institutionConfig.activeLevels || ['secundaria'];
  const isOnlySecundaria = activeLevels.length === 1 && activeLevels[0] === 'secundaria';
  const isOnlyPrimaria = activeLevels.length === 1 && activeLevels[0] === 'primaria';

  // Helper to accurately classify student educational level
  const getStudentLevel = (st: Student): 'inicial' | 'primaria' | 'secundaria' => {
    const rawL = (st.educationalLevel || '').toLowerCase();
    const rawG = (st.gradeLevel || '').toLowerCase();
    if (rawL.includes('ini') || rawG.includes('ini') || rawG.includes('año') || rawG.includes('celeste') || rawG.includes('roja')) {
      return 'inicial';
    }
    if (rawL.includes('pri') || rawG.includes('pri')) {
      return 'primaria';
    }
    return 'secundaria';
  };

  // Strictly filter students by active institution levels
  const activeRosterStudents = students.filter((st) => {
    const stLevel = getStudentLevel(st);
    return activeLevels.length === 0 || activeLevels.includes(stLevel);
  });

  // Calculate KPIs on active roster
  const totalStudents = activeRosterStudents.length;
  const avgAttendance = totalStudents > 0
    ? (activeRosterStudents.reduce((acc, s) => acc + (s.attendanceRate || 95), 0) / totalStudents).toFixed(1)
    : '0';
  const qrCardsGenerated = totalStudents;
  const studentsAtRisk = activeRosterStudents.filter((s) => (s.attendanceRate || 100) < 90).length;

  // Filtered students for table view
  const filteredStudents = activeRosterStudents.filter((st) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = st.fullName.toLowerCase().includes(q);
      const matchDni = (st.dni || '').toLowerCase().includes(q);
      const matchCode = st.enrollmentCode.toLowerCase().includes(q);
      const matchParent = (st.parentName || '').toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchCode && !matchParent) return false;
    }

    // Level filter (only relevant if institution is multilevel)
    if (selectedLevelFilter !== 'all' && activeLevels.length > 1) {
      const stLevel = getStudentLevel(st);
      if (stLevel !== selectedLevelFilter.toLowerCase()) return false;
    }

    // Grade filter
    if (selectedGradeFilter !== 'all') {
      const gradeSection = `${st.gradeLevel} ${st.section}`;
      if (!gradeSection.includes(selectedGradeFilter)) return false;
    }

    // Attendance filter
    if (attendanceFilter === 'high') {
      if ((st.attendanceRate || 0) < 95) return false;
    } else if (attendanceFilter === 'risk') {
      if ((st.attendanceRate || 100) >= 90) return false;
    }

    return true;
  });

  // Extract unique grades matching enabled grade configs or active roster
  const configuredGrades = (institutionConfig.gradeConfigs || [])
    .filter(g => g.enabled && activeLevels.includes(g.level))
    .flatMap(g => g.sections.map(s => `${g.gradeName} ${s}`));

  const rosterAulas = Array.from(new Set(activeRosterStudents.map((s) => `${s.gradeLevel} ${s.section}`)));
  const uniqueAulas = Array.from(new Set([...configuredGrades, ...rosterAulas])).filter(Boolean);

  const handleOpenCarnet = (student: Student) => {
    setSelectedStudentForCarnet(student);
    setCarnetModalOpen(true);
  };

  const handleOpenBatchCarnet = () => {
    if (activeRosterStudents.length > 0) {
      setSelectedStudentForCarnet(activeRosterStudents[0]);
      setCarnetModalOpen(true);
    }
  };

  const handleExportCSV = () => {
    const headers = 'DNI,NOMBRES_Y_APELLIDOS,CODIGO_MATRICULA,NIVEL,GRADO,SECCION,ASISTENCIA_PCT,APODERADO,TELEFONO_WHATSAPP\n';
    const rows = activeRosterStudents
      .map((s) =>
        `"${s.dni || ''}","${s.fullName}","${s.enrollmentCode}","${s.educationalLevel || 'Secundaria'}","${s.gradeLevel}","${s.section}","${s.attendanceRate}%","${s.parentName || ''}","${s.parentPhone || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const modCode = institutionConfig.modularCodeSecundaria || institutionConfig.modularCodePrimaria || '0743219';
    link.download = `padron_estudiantes_${modCode}_2026.csv`;
    link.click();
  };

  const getModalityLabel = () => {
    if (isOnlySecundaria) return 'Solo Secundaria (1° a 5°)';
    if (isOnlyPrimaria) return 'Solo Primaria (1° a 6°)';
    return `Multinivel (${activeLevels.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' + ')})`;
  };

  return (
    <div className="w-full max-w-full space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner / Heading */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Padrón Oficial de Matrícula · Año Lectivo {institutionConfig.academicYear || '2026'}</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
              Modalidad: {getModalityLabel()}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-white tracking-tight">
            Gestor Integral de Estudiantes
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Administra la matrícula oficial de <strong className="text-slate-200">{institutionConfig.institutionName}</strong>, 
            genera credenciales QR automáticas y sincroniza la nómina con el sistema SIAGIE del MINEDU.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Agregar Alumno</span>
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar SIAGIE / Excel</span>
          </button>

          {totalStudents > 0 && (
            <button
              type="button"
              onClick={handleOpenBatchCarnet}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <IdCard className="w-4 h-4 text-amber-400" />
              <span>Generar Carnets QR</span>
            </button>
          )}

          {totalStudents > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Exportar Padrón en Excel/CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Clean / Reset / Demo Actions */}
          {totalStudents > 0 ? (
            <>
              {onLoadDemoStudentsForLevel && (
              <button
                type="button"
                onClick={onLoadDemoStudentsForLevel}
                className="px-3 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-700/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title={`Recargar estudiantes demo adaptados al nivel activo (${activeLevels.join(', ')})`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Recargar Demo</span>
              </button>
              )}

              <button
                type="button"
                onClick={() => setClearConfirmModalOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Vaciar padrón de prueba e iniciar con alumnos reales"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Padrón en Blanco</span>
              </button>
            </>
          ) : onLoadDemoStudentsForLevel ? (
            <button
              type="button"
              onClick={onLoadDemoStudentsForLevel}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cargar estudiantes demo adaptados al nivel activo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cargar Demo {activeLevels[0]?.toUpperCase()}</span>
            </button>
          ) : null}

        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Matrícula Total</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-white">
            {totalStudents}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{totalStudents > 0 ? '100% con matrícula validada' : 'Padrón en blanco'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Asistencia Promedio</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-emerald-400">
            {avgAttendance}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Control de portería y QR
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Credenciales QR Emitidas</span>
            <QrCode className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-amber-400">
            {qrCardsGenerated}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Listas para imprimir o escanear
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Alertas de Inasistencia</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif-title font-bold text-rose-400">
            {studentsAtRisk}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Alumnos con asistencia &lt; 90%
          </div>
        </div>

      </div>

      {/* EMPTY STATE (When Roster is in Blank / Cleared) */}
      {totalStudents === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <School className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-serif-title font-bold text-white">
              Padrón Institucional en Blanco
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Tu institución está configurada como <strong className="text-amber-400">{getModalityLabel()}</strong>.
              El sistema está listo para registrar o importar a los estudiantes reales de tu colegio sin datos ficticios.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Registrar Primer Alumno</span>
            </button>

            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Nómina SIAGIE (Excel)</span>
            </button>

            {onLoadDemoStudentsForLevel && (
            <button
              type="button"
              onClick={onLoadDemoStudentsForLevel}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Cargar Nómina Demo para {activeLevels[0]?.toUpperCase()}</span>
            </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por alumno, DNI, código o apoderado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Filter Selectors */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
                
                {/* Aula Filter */}
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Todas las Aulas ({uniqueAulas.length})</option>
                  {uniqueAulas.map((aula) => (
                    <option key={aula} value={aula}>{aula}</option>
                  ))}
                </select>

                {/* Attendance Condition */}
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Toda Asistencia</option>
                  <option value="high">Puntualidad Destacada (≥95%)</option>
                  <option value="risk">En Riesgo (&lt;90%)</option>
                </select>

              </div>

            </div>

            {/* Level Filter Banner / Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Modalidad:
              </span>

              {activeLevels.length === 1 ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Nivel Exclusivo de la I.E.: {activeLevels[0].toUpperCase()} ({totalStudents} estudiantes)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    (Configurable en la pestaña "Configuración de la I.E.")
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedLevelFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedLevelFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white bg-slate-800/60'
                    }`}
                  >
                    Todos ({totalStudents})
                  </button>

                  {activeLevels.includes('inicial') && (
                    <button
                      type="button"
                      onClick={() => setSelectedLevelFilter('inicial')}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedLevelFilter === 'inicial'
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white bg-slate-800/60'
                      }`}
                    >
                      Nivel Inicial
                    </button>
                  )}

                  {activeLevels.includes('primaria') && (
                    <button
                      type="button"
                      onClick={() => setSelectedLevelFilter('primaria')}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedLevelFilter === 'primaria'
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white bg-slate-800/60'
                      }`}
                    >
                      Nivel Primaria
                    </button>
                  )}

                  {activeLevels.includes('secundaria') && (
                    <button
                      type="button"
                      onClick={() => setSelectedLevelFilter('secundaria')}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedLevelFilter === 'secundaria'
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white bg-slate-800/60'
                      }`}
                    >
                      Nivel Secundaria
                    </button>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* Table Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4">Estudiante</th>
                    <th className="py-4 px-3">DNI / Matrícula</th>
                    <th className="py-4 px-3">Nivel & Grado</th>
                    <th className="py-4 px-3">Sección</th>
                    <th className="py-4 px-3 text-center">Asistencia</th>
                    <th className="py-4 px-3">Apoderado & Contacto</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold text-white text-sm">No se encontraron estudiantes con los filtros aplicados</p>
                        <p className="text-xs text-slate-400 mt-1">Prueba cambiando el criterio de búsqueda o el aula seleccionada.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const isHigh = (student.attendanceRate || 0) >= 95;
                      const isRisk = (student.attendanceRate || 100) < 90;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Student Name & Photo */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={student.avatarUrl}
                                alt={student.fullName}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-white block text-sm">
                                  {student.fullName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {student.enrollmentCode}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* DNI */}
                          <td className="py-3.5 px-3 font-mono text-slate-300">
                            {student.dni || '---'}
                          </td>

                          {/* Grade Level */}
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-white block">
                              {student.gradeLevel}
                            </span>
                            <span className={`text-[10px] font-bold uppercase ${
                              (student.educationalLevel === 'Primaria' || student.gradeLevel.includes('Primaria'))
                                ? 'text-emerald-400'
                                : (student.educationalLevel === 'Inicial' || student.gradeLevel.includes('Inicial'))
                                ? 'text-purple-400'
                                : 'text-blue-400'
                            }`}>
                              {student.educationalLevel || 'Secundaria'}
                            </span>
                          </td>

                          {/* Section */}
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 font-bold text-white">
                              {student.section}
                            </span>
                          </td>

                          {/* Attendance */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              isHigh
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : isRisk
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            }`}>
                              {student.attendanceRate}%
                            </span>
                          </td>

                          {/* Parent */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              <span className="text-white block font-medium truncate max-w-[170px]" title={student.parentName}>
                                {student.parentName || 'Apoderado no reg.'}
                              </span>
                              {student.parentPhone && (
                                <a
                                  href={`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{student.parentPhone}</span>
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenCarnet(student)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 border border-slate-700 cursor-pointer transition-colors"
                                title="Ver Carnet QR inteligente"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Carnet QR</span>
                              </button>

                              {onSelectStudentForScanTest && (
                                <button
                                  type="button"
                                  onClick={() => onSelectStudentForScanTest(student)}
                                  className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 cursor-pointer transition-colors"
                                  title="Registrar ingreso manual de hoy"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onEditStudent && (
                                <button
                                  type="button"
                                  onClick={() => onEditStudent(student)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                                  title="Editar datos del estudiante"
                                  aria-label={`Editar a ${student.fullName}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                aria-label={`Retirar a ${student.fullName}`}
                                onClick={() => onDeleteStudent(student.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 cursor-pointer transition-colors"
                                title="Retirar estudiante de la nómina"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Mostrando <strong className="text-white">{filteredStudents.length}</strong> de <strong className="text-white">{totalStudents}</strong> estudiantes
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Sincronizado con el sistema de asistencia en tiempo real
              </span>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal to Clear Roster */}
      {clearConfirmModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setClearConfirmModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-serif-title font-bold text-white">
                ¿Limpiar datos de prueba y comenzar en blanco?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Esta acción retirará a los estudiantes de demostración para que tu institución quede en <strong>0 alumnos</strong>, lista para matricular a los estudiantes reales de tu colegio o cargar tu archivo oficial de SIAGIE (Excel).
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300">
                💡 Podrás recargar estudiantes de prueba en cualquier momento con el botón «Cargar Demo».
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllStudents?.();
                  setClearConfirmModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Vaciar Padrón</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddStudent={onAddStudent}
        institutionConfig={institutionConfig}
      />

      {/* Import SIAGIE Modal */}
      <ImportSiagieModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportStudents={onImportStudents}
        institutionConfig={institutionConfig}
      />

      {/* Student Carnet Modal */}
      {selectedStudentForCarnet && (
        <StudentCarnetModal
          isOpen={carnetModalOpen}
          onClose={() => setCarnetModalOpen(false)}
          student={selectedStudentForCarnet}
          allStudents={activeRosterStudents}
          institutionConfig={institutionConfig}
          onSelectStudentForScanTest={onSelectStudentForScanTest}
        />
      )}

    </div>
  );
};

export default StudentManagerModule;

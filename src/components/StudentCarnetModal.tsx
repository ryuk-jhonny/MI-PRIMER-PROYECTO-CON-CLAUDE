import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  CheckCircle2, 
  ShieldCheck, 
  GraduationCap, 
  Phone, 
  Calendar, 
  Sparkles,
  School,
  IdCard,
  Layers
} from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import StudentQrCanvas from './StudentQrCanvas';

interface StudentCarnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  allStudents?: Student[];
  institutionConfig: InstitutionConfig;
  onSelectStudentForScanTest?: (student: Student) => void;
}

export const StudentCarnetModal: React.FC<StudentCarnetModalProps> = ({
  isOpen,
  onClose,
  student,
  allStudents = [],
  institutionConfig,
  onSelectStudentForScanTest,
}) => {
  const [viewMode, setViewMode] = useState<'individual' | 'batch'>('individual');
  const [selectedBatchAula, setSelectedBatchAula] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !student) return null;

  // Filter students for batch printing
  const batchStudents = selectedBatchAula === 'all'
    ? allStudents
    : allStudents.filter(s => `${s.gradeLevel} ${s.section}`.includes(selectedBatchAula));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSingle = () => {
    // Locate the canvas inside the modal and trigger download
    const canvas = document.getElementById(`qr-canvas-${student.id}`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `Carnet_QR_${student.fullName.replace(/\s+/g, '_')}_${student.dni || student.enrollmentCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  // Distinct aulas list for batch filter
  const uniqueAulas = Array.from(new Set(allStudents.map(s => `${s.gradeLevel} ${s.section}`)));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white text-slate-100 print:text-black">
        
        {/* Header - Hidden on Print */}
        <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title text-xl font-bold text-white">Generador de Carnets Escolares QR</h3>
                <span className="text-xs font-semibold text-emerald-400">
                  · MINEDU CNEB Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Credencial institucional inteligente para control de acceso por torniquetes y puerta principal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch */}
            <div className="hidden sm:flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('individual')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'individual'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Carnet Individual
              </button>
              <button
                type="button"
                onClick={() => setViewMode('batch')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'batch'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Lote de Impresión ({allStudents.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar - Hidden on Print */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            {viewMode === 'batch' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Filtrar por Aula:</span>
                <select
                  value={selectedBatchAula}
                  onChange={(e) => setSelectedBatchAula(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todas las Aulas ({allStudents.length} alumnos)</option>
                  {uniqueAulas.map(aula => (
                    <option key={aula} value={aula}>{aula}</option>
                  ))}
                </select>
              </div>
            )}
            {viewMode === 'individual' && (
              <div className="flex items-center gap-2 text-slate-400">
                <span>Estudiante:</span>
                <span className="font-bold text-amber-400">{student.fullName}</span>
                <span className="text-slate-500 font-mono">({student.dni || student.enrollmentCode})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'individual' && onSelectStudentForScanTest && (
              <button
                type="button"
                onClick={() => {
                  onSelectStudentForScanTest(student);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Registrar ingreso de hoy</span>
              </button>
            )}

            {viewMode === 'individual' && (
              <button
                type="button"
                onClick={handleDownloadSingle}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{downloadSuccess ? '¡Descargado!' : 'Descargar QR'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{viewMode === 'individual' ? 'Imprimir Carnet' : `Imprimir ${batchStudents.length} Carnets`}</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Carnet Display Area */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          
          {/* INDIVIDUAL VIEW */}
          {viewMode === 'individual' && (
            <div className="flex flex-col items-center justify-center space-y-6">
              
              {/* Carnet Preview Wrapper (Standard ID-1 / CR80 card aspect ratio) */}
              <div 
                id="printable-carnet-card"
                className="w-full max-w-md rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-2 border-amber-500/40 shadow-2xl relative text-white transition-all transform hover:scale-[1.01]"
              >
                {/* Decorative Top Accent Bar */}
                <div className="h-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

                {/* Card Header: School Branding */}
                <div className="p-4 sm:p-5 pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white tracking-wide uppercase line-clamp-1">
                        {institutionConfig.institutionName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>Cód. Mod: {student.educationalLevel === 'Primaria' ? institutionConfig.modularCodePrimaria : (institutionConfig.modularCodeSecundaria || '0743219')}</span>
                        <span>•</span>
                        <span>UGEL {institutionConfig.ugel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      CARNET {student.academicYear || '2026'}
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 grid grid-cols-12 gap-4 items-center">
                  
                  {/* Left: Student Photo & QR */}
                  <div className="col-span-5 flex flex-col items-center space-y-3">
                    <div className="relative">
                      <img
                        src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                        alt={student.fullName}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-amber-400/60 shadow-lg shadow-black/50"
                      />
                      <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-slate-950 rounded-full border-2 border-slate-900" title="Matrícula Activa">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col items-center">
                      <StudentQrCanvas
                        value={student.qrCodeValue || `RYUK://STU/2026/${student.dni || student.enrollmentCode}`}
                        size={110}
                        className="w-[110px] h-[110px]"
                      />
                      <span className="text-[8px] font-mono font-bold text-slate-800 tracking-tighter mt-1">
                        {student.enrollmentCode}
                      </span>
                    </div>
                  </div>

                  {/* Right: Student Information & Security Chips */}
                  <div className="col-span-7 space-y-3">
                    
                    {/* Full Name */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                        Estudiante
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        {student.fullName}
                      </h3>
                    </div>

                    {/* Academic Placement */}
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Nivel:</span>
                        <span className="font-bold text-slate-200">{student.educationalLevel || 'Secundaria'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Grado y Sección:</span>
                        <span className="font-black text-amber-300">{student.gradeLevel} - {student.section}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">DNI / SIAGIE:</span>
                        <span className="font-mono font-bold text-white">{student.dni || student.enrollmentCode}</span>
                      </div>
                    </div>

                    {/* Emergency & Parent info */}
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>Apoderado / Emergencias:</span>
                      </div>
                      <p className="font-semibold text-white pl-4 truncate">
                        {student.parentName || 'Apoderado Registrado'}
                      </p>
                      <p className="font-mono text-emerald-400 pl-4 font-bold">
                        {student.parentPhone || '+51 987 654 321'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Card Bottom Security Strip */}
                <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>SISTEMA DE ASISTENCIA BIOMÉTRICA & QR</span>
                  </div>
                  <span className="font-bold text-slate-300">VÁLIDO HASTA DIC 2026</span>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="text-center text-xs text-slate-400 max-w-md space-y-1">
                <p className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Listo para imprimir en papel fotográfico, PVC o cartulina opalina.
                </p>
                <p>
                  El código QR es reconocido instantáneamente por la cámara del módulo de portería de la institución.
                </p>
              </div>

            </div>
          )}

          {/* BATCH PRINT VIEW */}
          {viewMode === 'batch' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Lote de Carnets Listos para Impresión ({batchStudents.length} estudiantes)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Disposición optimizada en cuadrícula (formato de hoja A4 para recortar y laminar)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 shadow-md cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Todas</span>
                </button>
              </div>

              {/* Grid of Printable Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                {batchStudents.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 shadow-lg text-white print:border-slate-300 print:shadow-none print:break-inside-avoid"
                  >
                    <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
                    
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
                      <div className="font-bold truncate max-w-[200px]">
                        {institutionConfig.institutionName}
                      </div>
                      <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                        AÑO 2026
                      </span>
                    </div>

                    <div className="p-3.5 flex items-center gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <img
                          src={st.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={st.fullName}
                          className="w-16 h-16 rounded-xl object-cover border border-amber-400/50 mb-2"
                        />
                        <div className="p-1 bg-white rounded-lg">
                          <StudentQrCanvas
                            value={st.qrCodeValue || `RYUK://STU/2026/${st.dni || st.enrollmentCode}`}
                            size={72}
                            className="w-[72px] h-[72px]"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 text-xs">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
                          {st.educationalLevel || 'Estudiante'}
                        </span>
                        <h4 className="font-extrabold text-white text-sm leading-tight truncate">
                          {st.fullName}
                        </h4>
                        
                        <div className="bg-slate-800/80 rounded-lg p-2 text-[10px] space-y-0.5 font-medium">
                          <div className="text-amber-300 font-bold">
                            {st.gradeLevel} - {st.section}
                          </div>
                          <div className="text-slate-300 font-mono">
                            DNI: {st.dni || st.enrollmentCode}
                          </div>
                          <div className="text-slate-400 truncate">
                            Apod: {st.parentName || 'Registrado'}
                          </div>
                        </div>

                        <div className="text-[9px] font-mono text-emerald-400 font-semibold truncate">
                          Emergencias: {st.parentPhone || '+51 987 654 321'}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1 bg-slate-950 border-t border-slate-800 text-[8px] text-slate-400 flex items-center justify-between">
                      <span>CÓD. MODULAR: {st.educationalLevel === 'Primaria' ? institutionConfig.modularCodePrimaria : (institutionConfig.modularCodeSecundaria || '0743219')}</span>
                      <span className="font-bold text-amber-400">CREDENCIAL INTELIGENTE QR</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Formato homologado para credencial escolar de plástico PVC y papel couche laminado</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentCarnetModal;

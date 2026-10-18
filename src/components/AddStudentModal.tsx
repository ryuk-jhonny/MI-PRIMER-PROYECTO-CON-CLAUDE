import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Check, 
  Sparkles, 
  IdCard, 
  Phone, 
  User, 
  GraduationCap, 
  School,
  AlertCircle
} from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import StudentQrCanvas from './StudentQrCanvas';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (newStudent: Student) => void;
  institutionConfig: InstitutionConfig;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
];

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  institutionConfig,
}) => {
  const activeLevels = institutionConfig.activeLevels || ['secundaria'];
  const initialLevel: 'Inicial' | 'Primaria' | 'Secundaria' = activeLevels.includes('secundaria')
    ? 'Secundaria'
    : activeLevels.includes('primaria')
    ? 'Primaria'
    : 'Inicial';

  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [educationalLevel, setEducationalLevel] = useState<'Inicial' | 'Primaria' | 'Secundaria'>(initialLevel);
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+51 9');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep educationalLevel in sync with activeLevels
  useEffect(() => {
    if (!activeLevels.includes(educationalLevel.toLowerCase() as any)) {
      setEducationalLevel(initialLevel);
    }
  }, [activeLevels, initialLevel, educationalLevel]);

  // Extract enabled grade configs matching the selected educationalLevel
  const availableGrades = (institutionConfig.gradeConfigs || [])
    .filter(g => g.level.toLowerCase() === educationalLevel.toLowerCase() && g.enabled);

  // Set default grade when educationalLevel changes or on mount
  useEffect(() => {
    if (availableGrades.length > 0) {
      setGrade(availableGrades[0].gradeName);
      setSection(availableGrades[0].sections[0] || 'A');
    } else {
      if (educationalLevel === 'Inicial') setGrade('Inicial 5 Años');
      else if (educationalLevel === 'Primaria') setGrade('1ro Primaria');
      else setGrade('1ro Secundaria');
      setSection('A');
    }
  }, [educationalLevel, institutionConfig]);

  // When grade changes, update available sections
  const currentGradeConfig = availableGrades.find(g => g.gradeName === grade);
  const sectionOptions = currentGradeConfig?.sections && currentGradeConfig.sections.length > 0
    ? currentGradeConfig.sections
    : ['A', 'B'];

  useEffect(() => {
    if (!sectionOptions.includes(section)) {
      setSection(sectionOptions[0] || 'A');
    }
  }, [grade, sectionOptions, section]);

  if (!isOpen) return null;

  const previewQrValue = `RYUK://STU/2026/${dni || '00000000'}/${fullName.toUpperCase().replace(/\s+/g, '-') || 'NUEVO'}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Por favor ingrese los nombres y apellidos completos del estudiante.');
      return;
    }
    if (!dni.trim() || dni.length < 8) {
      setErrorMsg('El DNI o código de matrícula debe tener al menos 8 dígitos.');
      return;
    }
    if (!parentName.trim()) {
      setErrorMsg('Ingrese el nombre del apoderado o tutor.');
      return;
    }

    const newStudent: Student = {
      id: `RYUK-EST-2026-${Date.now().toString().slice(-4)}`,
      qrCodeValue: previewQrValue,
      fullName: fullName.trim(),
      dni: dni.trim(),
      enrollmentCode: `EST-${dni.trim().slice(-5) || Math.floor(10000 + Math.random() * 90000)}`,
      gradeLevel: grade,
      section: section,
      avatarUrl: avatarUrl,
      institutionName: institutionConfig.institutionName,
      academicYear: institutionConfig.academicYear || '2026',
      attendanceRate: 100,
      totalDays: 78,
      presentDays: 78,
      lateDays: 0,
      absentDays: 0,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      educationalLevel: educationalLevel,
      grades: [
        {
          courseId: 'c1',
          courseName: educationalLevel === 'Inicial' ? 'Psicomotricidad' : 'Matemática',
          teacherName: 'Prof. Asignado',
          unit1: 'A',
          unit2: 'AD',
          unit3: 'A',
          average: 'A',
          status: 'Logro Esperado',
          recentFeedback: 'Matrícula reciente año escolar 2026.',
        },
      ],
      attendanceHistory: [
        {
          date: '16 Oct 2026',
          dayName: 'Viernes',
          status: 'Puntual',
          timeIn: '07:40 AM',
          verifiedBy: 'Registro de Matrícula',
        },
      ],
    };

    onAddStudent(newStudent);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif-title font-bold text-white">
                Registrar Nuevo Alumno en Nómina
              </h3>
              <p className="text-xs text-slate-400">
                Añade al estudiante a la nómina oficial y genera su credencial QR automática
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Educational Level Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nivel Educativo
            </label>
            {activeLevels.length === 1 ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white capitalize">
                    Modalidad Institucional: Solo {activeLevels[0]}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Fijado por Configuración I.E.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(['Inicial', 'Primaria', 'Secundaria'] as const)
                  .filter(lvl => activeLevels.includes(lvl.toLowerCase() as any))
                  .map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEducationalLevel(lvl)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        educationalLevel === lvl
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{lvl}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">● Habilitado</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Student Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300">
                Nombres y Apellidos Completos *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Sofía Quispe Mendoza"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                DNI o Código de Matrícula (8 dígitos) *
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Ej: 73948210"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Grade Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Grado Escolar *
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {availableGrades.map((g) => (
                  <option key={g.gradeId} value={g.gradeName}>
                    {g.gradeName} ({g.sections.length} secciones)
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Sección (Aula) *
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer font-bold"
              >
                {sectionOptions.map((sec) => (
                  <option key={sec} value={sec}>
                    Sección {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Avatar Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Foto para Fotocheck QR
              </label>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      avatarUrl === url ? 'border-amber-400 scale-105' : 'border-slate-800 opacity-60'
                    }`}
                  >
                    <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Parent & Emergency Contact */}
          <div className="pt-2 border-t border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Datos del Apoderado y Notificación WhatsApp
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Nombres del Apoderado / Tutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Benítez Flores"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Teléfono Móvil (WhatsApp de Asistencia)
                </label>
                <input
                  type="text"
                  placeholder="+51 987 654 321"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Real-time QR Code Preview */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Generador Automático de Credencial QR</span>
              </span>
              <p className="text-xs font-bold text-white">
                {fullName || 'Nombre del Estudiante'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {previewQrValue}
              </p>
            </div>
            <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
              <StudentQrCanvas
                value={previewQrValue}
                size={70}
                className="w-16 h-16"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Guardar y Emitir Carnet QR</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;

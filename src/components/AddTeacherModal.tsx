import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  School, 
  Mail, 
  Phone, 
  CheckCircle2, 
  IdCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { Teacher, TeacherPortfolioItem, CnebArea } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import { TEACHER_PORTFOLIO_ITEMS } from '../data/mockData';

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTeacher: (teacher: Teacher) => void;
  institutionConfig: InstitutionConfig;
}

const CNEB_AREAS_OPTIONS: CnebArea[] = [
  'Matemática',
  'Comunicación',
  'Ciencia y Tecnología',
  'Ciencias Sociales',
  'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
  'Educación para el Trabajo (EPT)',
  'Inglés',
  'Arte y Cultura',
  'Educación Física',
];

export const TEACHER_MALE_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
];

export const TEACHER_FEMALE_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&auto=format&fit=crop&q=80',
];

export default function AddTeacherModal({
  isOpen,
  onClose,
  onAddTeacher,
  institutionConfig,
}: AddTeacherModalProps) {
  const activeLevels = institutionConfig.activeLevels || ['secundaria'];
  const defaultLevel = activeLevels.includes('secundaria')
    ? 'Secundaria'
    : activeLevels.includes('primaria')
    ? 'Primaria'
    : 'Inicial';

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(TEACHER_MALE_AVATARS[0]);
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<string>(defaultLevel);
  const [area, setArea] = useState<string>('Matemática');
  const [grades, setGrades] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenderChange = (newGender: 'M' | 'F') => {
    setGender(newGender);
    const list = newGender === 'M' ? TEACHER_MALE_AVATARS : TEACHER_FEMALE_AVATARS;
    setSelectedAvatar(list[0]);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const lower = val.toLowerCase();
    const femaleHints = ['maría', 'maria', 'elena', 'carmen', 'patricia', 'rosa', 'ana', 'profesora', 'licda.', 'ingda.', 'claudia', 'lucia', 'valeria', 'sofia', 'camila', 'laura', 'silvia'];
    const maleHints = ['carlos', 'juan', 'pedro', 'mario', 'luis', 'jorge', 'david', 'profesor', 'alberto', 'roberto', 'miguel', 'javier', 'daniel', 'victor', 'cesar', 'hugo', 'eduardo', 'manuel'];
    
    if (femaleHints.some(h => lower.includes(h)) && !maleHints.some(h => lower.includes(h))) {
      if (gender !== 'F') handleGenderChange('F');
    } else if (maleHints.some(h => lower.includes(h)) && !femaleHints.some(h => lower.includes(h))) {
      if (gender !== 'M') handleGenderChange('M');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Por favor ingrese el nombre completo del docente.');
      return;
    }

    const cleanDni = dni.trim();
    if (cleanDni && cleanDni.length !== 8) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos.');
      return;
    }

    const teacherId = `tch-${Date.now()}`;
    const chosenAvatar = selectedAvatar || (gender === 'M' ? TEACHER_MALE_AVATARS[0] : TEACHER_FEMALE_AVATARS[0]);

    // Create a matching sample portfolio item for CNEB
    const matchingSample: TeacherPortfolioItem = {
      id: `PORT-CNEB-NEW-${Date.now()}`,
      category: 'Sesión de Aprendizaje',
      cnebArea: (CNEB_AREAS_OPTIONS.includes(area as any) ? area : 'Matemática') as CnebArea,
      title: `Sesión CNEB: Desarrollo de Capacidades en ${area}`,
      competency: `Aplica competencias y estándares curriculares del área de ${area}`,
      capabilities: [
        'Problematiza situaciones del contexto comunitario',
        'Diseña estrategias formativas participativas',
        'Genera evidencias de aprendizaje verificables',
        'Evalúa formativamente el progreso con rúbricas CNEB',
      ],
      learningPurpose: `Los estudiantes desarrollan aprendizajes significativos en el área de ${area} (${level}) vinculados a su vida cotidiana.`,
      performanceCriterion: `Sustenta desempeños y criterios de logro precisados en el Programa Curricular del nivel ${level}.`,
      evidenceDescription: `Registro de evidencias de clase, fichas de coevaluación y portafolio del estudiante.`,
      evaluationInstrument: 'Rúbrica analítica por niveles de logro CNEB (AD, A, B, C)',
      rubric: {
        AD: 'Demuestra dominio pleno y reflexivo de la competencia planteada proponiendo soluciones autónomas.',
        A: 'Alcanza el nivel esperado en los criterios evaluados con solvencia y claridad.',
        B: 'Se encuentra en camino de consolidar los aprendizajes; requiere retroalimentación orientadora.',
        C: 'Requiere acompañamiento directo para afianzar los desempeños básicos.',
      },
      gradeTarget: `${level}: ${grades || 'Aulas asignadas'}`,
      sectionTarget: 'Nómina activa',
      teacherName: cleanName.startsWith('Prof.') || cleanName.startsWith('Lic.') || cleanName.startsWith('Ing.') ? cleanName : `Prof. ${cleanName}`,
      updatedAt: 'Hoy',
      status: 'En Revisión',
      visadoBy: 'Coordinación Pedagógica CNEB',
      visadoDate: 'Pendiente',
      filesCount: 3,
      description: `Carpeta pedagógica oficial del docente con planificación de unidades, sesiones de aprendizaje y rúbricas formativas CNEB.`,
    };

    const newTeacher: Teacher = {
      id: teacherId,
      name: cleanName.startsWith('Prof.') || cleanName.startsWith('Lic.') || cleanName.startsWith('Ing.') ? cleanName : `Prof. ${cleanName}`,
      gender: gender,
      dni: cleanDni || `0${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: email.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@${institutionConfig.shortName.toLowerCase().replace(/\s+/g, '')}.edu.pe`,
      phone: phone.trim() || '+51 987 654 321',
      area,
      level,
      grades: grades.trim() || `${level} General`,
      portfolioProgress: 85,
      rubricsComplete: 3,
      rubricsTotal: 4,
      status: 'Al día',
      lastUpload: 'Hoy, Registro Inicial',
      avatarUrl: chosenAvatar,
      sampleItem: matchingSample,
    };

    onAddTeacher(newTeacher);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold font-serif-title">Registrar Nuevo Docente</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-extrabold uppercase">
                  CNEB 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Incorpora docentes a la nómina institucional, asigna áreas curriculares y crea su portafolio digital.
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

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nombre Completo */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Nombres y Apellidos del Docente <span className="text-orange-400">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Prof. Carlos Huamán Quispe"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Género del Docente */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Género / Tipo de Docente <span className="text-orange-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderChange('M')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  gender === 'M'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/25'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base">👨</span>
                <span>Profesor (Varón)</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange('F')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  gender === 'F'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/25'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base">👩</span>
                <span>Profesora (Mujer)</span>
              </button>
            </div>
          </div>

          {/* Galería de Fotos según Género */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Foto de Perfil ({gender === 'M' ? 'Profesor Varón' : 'Profesora'})
            </label>
            <div className="flex items-center gap-3 overflow-x-auto p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
              {(gender === 'M' ? TEACHER_MALE_AVATARS : TEACHER_FEMALE_AVATARS).map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAvatar(imgUrl)}
                  className={`relative rounded-xl p-0.5 transition-all shrink-0 cursor-pointer ${
                    selectedAvatar === imgUrl
                      ? 'ring-2 ring-orange-500 scale-105'
                      : 'opacity-50 hover:opacity-100 hover:scale-102'
                  }`}
                  title={gender === 'M' ? `Profesor ${i + 1}` : `Profesora ${i + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt={`Avatar ${i + 1}`}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  {selectedAvatar === imgUrl && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {gender === 'M' ? '✓ Seleccionada foto masculina para el docente.' : '✓ Seleccionada foto femenina para la docente.'}
            </p>
          </div>

          {/* DNI y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                DNI (Documento de Identidad)
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="8 dígitos (ej: 45892134)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Teléfono / WhatsApp de Contacto
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +51 987 654 321"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Nivel Educativo y Área Curricular */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Nivel Educativo Asignado <span className="text-orange-400">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-orange-500 cursor-pointer"
                >
                  {activeLevels.includes('inicial') && (
                    <option value="Inicial">Nivel Inicial</option>
                  )}
                  {activeLevels.includes('primaria') && (
                    <option value="Primaria">Nivel Primaria</option>
                  )}
                  {activeLevels.includes('secundaria') && (
                    <option value="Secundaria">Nivel Secundaria</option>
                  )}
                  {activeLevels.length > 1 && (
                    <option value="Primaria y Secundaria">Primaria y Secundaria</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Área Curricular CNEB <span className="text-orange-400">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-orange-500 cursor-pointer"
                >
                  {level === 'Inicial' ? (
                    <>
                      <option value="Educación Inicial Integral">Educación Inicial Integral (3-5 Años)</option>
                      <option value="Psicomotricidad">Psicomotricidad</option>
                      <option value="Inglés Inicial">Inglés para Niños</option>
                    </>
                  ) : level === 'Primaria' ? (
                    <>
                      <option value="Educación Primaria Integral">Educación Primaria Integral</option>
                      <option value="Matemática">Matemática</option>
                      <option value="Comunicación">Comunicación</option>
                      <option value="Ciencia y Tecnología">Ciencia y Tecnología</option>
                      <option value="Personal Social">Personal Social</option>
                      <option value="Inglés">Inglés</option>
                      <option value="Educación Física">Educación Física</option>
                      <option value="Arte y Cultura">Arte y Cultura</option>
                    </>
                  ) : (
                    CNEB_AREAS_OPTIONS.map((ar) => (
                      <option key={ar} value={ar}>
                        {ar}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Grados y Secciones a Cargo */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Grados y Secciones Asignados
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={grades}
                onChange={(e) => setGrades(e.target.value)}
                placeholder="Ej: 3°, 4° y 5° Secundaria (Secciones A y B)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Correo Institucional o Personal
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: docente@colegio-ryuk.edu.pe"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Al guardar, se creará automáticamente el <strong>Portafolio Digital CNEB</strong> del docente con su programación anual, unidades y rúbricas.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Docente</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

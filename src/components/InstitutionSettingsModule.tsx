import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  School, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  Calendar, 
  Smartphone, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Sparkles,
  Info,
  GraduationCap,
  BookOpen,
  Baby,
  AlertCircle,
  X,
  UserCheck,
  User,
  Mail,
  Phone,
  Award,
  IdCard,
  Edit3,
  Camera,
  Check,
  Search,
  FileText
} from 'lucide-react';
import { Teacher } from '../types/education';
import { 
  InstitutionConfig, 
  EducationalLevel, 
  GradeSectionConfig, 
  DEFAULT_INSTITUTION_CONFIG, 
  PRESET_ONLY_SECUNDARIA, 
  PRESET_ONLY_PRIMARIA, 
  PRESET_INTEGRAL,
  DirectorProfile,
  DEFAULT_DIRECTOR_PROFILE
} from '../types/institution';

interface InstitutionSettingsModuleProps {
  config: InstitutionConfig;
  onSaveConfig: (updated: InstitutionConfig) => void;
  onToast: (message: string) => void;
  onSyncDemoStudentsForLevels?: (levels: EducationalLevel[]) => void;
  directorProfile?: DirectorProfile;
  onUpdateDirectorProfile?: (updated: DirectorProfile) => void;
  teachers?: Teacher[];
  onUpdateTeacher?: (updated: Teacher) => void;
  initialSubTab?: 'niveles' | 'identidad' | 'aulas' | 'asistencia' | 'periodos' | 'perfiles';
}

export default function InstitutionSettingsModule({
  config: initialConfig,
  onSaveConfig,
  onToast,
  onSyncDemoStudentsForLevels,
  directorProfile = DEFAULT_DIRECTOR_PROFILE,
  onUpdateDirectorProfile,
  teachers = [],
  onUpdateTeacher,
  initialSubTab,
}: InstitutionSettingsModuleProps) {
  const [formData, setFormData] = useState<InstitutionConfig>(() => ({
    ...DEFAULT_INSTITUTION_CONFIG,
    ...initialConfig,
    activeLevels: initialConfig?.activeLevels?.length ? initialConfig.activeLevels : DEFAULT_INSTITUTION_CONFIG.activeLevels,
    gradeConfigs: initialConfig?.gradeConfigs?.length ? initialConfig.gradeConfigs : DEFAULT_INSTITUTION_CONFIG.gradeConfigs,
  }));

  const [activeSubTab, setActiveSubTab] = useState<'niveles' | 'identidad' | 'aulas' | 'asistencia' | 'periodos' | 'perfiles'>(
    initialSubTab || 'niveles'
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncDemoOnPreset, setSyncDemoOnPreset] = useState(true);

  // Profile management states
  const [profileRoleMode, setProfileRoleMode] = useState<'director' | 'docente'>('director');
  
  // Director Form state
  const [directorForm, setDirectorForm] = useState<DirectorProfile>(() => directorProfile || DEFAULT_DIRECTOR_PROFILE);
  
  // Teacher Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => teachers?.[0]?.id || '');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherForm, setTeacherForm] = useState<Teacher | null>(null);

  // Synchronize directorProfile when prop changes
  useEffect(() => {
    if (directorProfile) {
      setDirectorForm(directorProfile);
    }
  }, [directorProfile]);

  // Synchronize initialSubTab when prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Synchronize teacherForm when teachers or selectedTeacherId changes
  useEffect(() => {
    if (teachers && teachers.length > 0) {
      const current = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
      if (current) {
        if (!selectedTeacherId || !teachers.some(t => t.id === selectedTeacherId)) {
          setSelectedTeacherId(current.id);
        }
        setTeacherForm({ ...current });
      }
    }
  }, [teachers, selectedTeacherId]);

  // Helper to update top-level field
  const updateField = <K extends keyof InstitutionConfig>(key: K, value: InstitutionConfig[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // Toggle educational level
  const toggleLevel = (level: EducationalLevel) => {
    let nextLevels: EducationalLevel[];
    if (formData.activeLevels.includes(level)) {
      if (formData.activeLevels.length === 1) {
        onToast('La institución debe tener al menos un nivel educativo activo.');
        return;
      }
      nextLevels = formData.activeLevels.filter(l => l !== level);
    } else {
      nextLevels = [...formData.activeLevels, level];
    }
    setFormData(prev => ({
      ...prev,
      activeLevels: nextLevels
    }));
    setHasUnsavedChanges(true);
    onToast(`Nivel ${level.toUpperCase()} ${nextLevels.includes(level) ? 'activado' : 'desactivado'}`);
  };

  // Apply a preset
  const applyPreset = (preset: InstitutionConfig, presetName: string) => {
    const updated = {
      ...preset,
      gradeConfigs: preset.gradeConfigs || DEFAULT_INSTITUTION_CONFIG.gradeConfigs,
    };
    setFormData(updated);
    setHasUnsavedChanges(true);

    if (syncDemoOnPreset && onSyncDemoStudentsForLevels) {
      onSyncDemoStudentsForLevels(updated.activeLevels);
      onToast(`Plantilla "${presetName}" cargada y estudiantes demo adaptados a ${updated.activeLevels.join(' + ').toUpperCase()}`);
    } else {
      onToast(`Plantilla "${presetName}" cargada correctamente`);
    }
  };

  // Add section to a grade
  const addSection = (gradeId: string) => {
    setFormData(prev => {
      const updatedGrades = (prev.gradeConfigs || []).map(g => {
        if (g.gradeId === gradeId) {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const nextLetter = alphabet[g.sections.length] || `Sec-${g.sections.length + 1}`;
          return {
            ...g,
            sections: [...g.sections, nextLetter]
          };
        }
        return g;
      });
      return { ...prev, gradeConfigs: updatedGrades };
    });
    setHasUnsavedChanges(true);
  };

  // Remove section from a grade
  const removeSection = (gradeId: string, sectionToRemove: string) => {
    setFormData(prev => {
      const updatedGrades = (prev.gradeConfigs || []).map(g => {
        if (g.gradeId === gradeId) {
          if (g.sections.length <= 1) {
            onToast('Cada grado debe tener al menos una sección activa.');
            return g;
          }
          return {
            ...g,
            sections: g.sections.filter(s => s !== sectionToRemove)
          };
        }
        return g;
      });
      return { ...prev, gradeConfigs: updatedGrades };
    });
    setHasUnsavedChanges(true);
  };

  // Toggle grade enabled/disabled
  const toggleGrade = (gradeId: string) => {
    setFormData(prev => {
      const updatedGrades = (prev.gradeConfigs || []).map(g => {
        if (g.gradeId === gradeId) {
          return { ...g, enabled: !g.enabled };
        }
        return g;
      });
      return { ...prev, gradeConfigs: updatedGrades };
    });
    setHasUnsavedChanges(true);
  };

  // Update capacity per section
  const updateGradeCapacity = (gradeId: string, capacity: number) => {
    setFormData(prev => {
      const updatedGrades = (prev.gradeConfigs || []).map(g => {
        if (g.gradeId === gradeId) {
          return { ...g, capacityPerSection: Math.max(5, Math.min(60, capacity)) };
        }
        return g;
      });
      return { ...prev, gradeConfigs: updatedGrades };
    });
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig(formData);
    setHasUnsavedChanges(false);
    onToast('✓ Configuración institucional guardada y aplicada exitosamente');
  };

  // Reset to default
  const handleReset = () => {
    setFormData(DEFAULT_INSTITUTION_CONFIG);
    setHasUnsavedChanges(true);
    onToast('Se han restaurado los valores por defecto del Colegio Ryuk');
  };

  // Calculations for summary card
  const activeGrades = (formData.gradeConfigs || []).filter(g => (formData.activeLevels || []).includes(g.level) && g.enabled);
  const totalSections = activeGrades.reduce((sum, g) => sum + (g.sections?.length || 0), 0);
  const totalCapacity = activeGrades.reduce((sum, g) => sum + ((g.sections?.length || 0) * (g.capacityPerSection || 30)), 0);

  // Formatted active levels text
  const getActiveLevelsText = () => {
    const lvls = formData.activeLevels || [];
    if (lvls.length === 3) return 'Inicial + Prim. + Sec.';
    return lvls.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' + ');
  };

  return (
    <div className="w-full max-w-full space-y-6 animate-in fade-in duration-300">
      
      {/* =========================================================================
          MODULE HEADER & QUICK PRESETS
         ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Módulo de Gestión y Estructura I.E.</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-white tracking-tight flex items-center gap-2.5">
            Configuración de la Institución Educativa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Personaliza los niveles educativos (Primaria, Secundaria o Multinivel), códigos oficiales MINEDU/SIAGIE, aforo por secciones y reglas de ingreso por QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer flex items-center gap-2 active:scale-95"
            title="Restablecer configuración predeterminada"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restablecer</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
              hasUnsavedChanges 
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25 ring-2 ring-amber-400/50' 
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{hasUnsavedChanges ? 'Guardar Cambios *' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRESET SELECTOR CARDS (1-Click Architectures)
         ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plantillas Rápidas por Tipo de Institución</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Elige el formato de tu I.E. con 1 solo clic
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Preset 1: Multinivel */}
          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_INSTITUTION_CONFIG, 'Multinivel (Primaria + Secundaria)')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${
              formData.activeLevels.includes('primaria') && formData.activeLevels.includes('secundaria') && !formData.activeLevels.includes('inicial')
                ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  🏫 Multinivel
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Pri + Sec
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Primaria (1°-6°) y Secundaria (1°-5°). Formato estándar colegios privados.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <span>Cargar formato</span> →
            </div>
          </button>

          {/* Preset 2: Solo Secundaria */}
          <button
            type="button"
            onClick={() => applyPreset(PRESET_ONLY_SECUNDARIA, 'Solo Secundaria (G.U.E. Mariscal Cáceres)')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${
              formData.activeLevels.length === 1 && formData.activeLevels[0] === 'secundaria'
                ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  🎓 Solo Secundaria
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                  1° a 5° Sec.
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Para Colegios Emblemáticos, G.U.E. y Colegios Secundarios exclusivos.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <span>Cargar formato</span> →
            </div>
          </button>

          {/* Preset 3: Solo Primaria */}
          <button
            type="button"
            onClick={() => applyPreset(PRESET_ONLY_PRIMARIA, 'Solo Primaria (I.E. 7054 Semillitas)')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${
              formData.activeLevels.length === 1 && formData.activeLevels[0] === 'primaria'
                ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  🎒 Solo Primaria
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  1° a 6° Prim.
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Escuelas primarias con tutoría por aula integral y evaluación descriptiva.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <span>Cargar formato</span> →
            </div>
          </button>

          {/* Preset 4: Completo Integral */}
          <button
            type="button"
            onClick={() => applyPreset(PRESET_INTEGRAL, 'Integral CNEB (Inicial + Primaria + Secundaria)')}
            className={`p-4 rounded-2xl text-left border transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${
              formData.activeLevels.length === 3
                ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  🌟 Integral CNEB
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  3 Niveles
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Inicial (3-5 años), Primaria (1°-6°) y Secundaria (1°-5°).
              </p>
            </div>
            <div className="mt-3 text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <span>Cargar formato</span> →
            </div>
          </button>
        </div>

        {/* Dynamic Demo Student Adaptation Option */}
        {onSyncDemoStudentsForLevels && <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncDemoOnPreset}
              onChange={(e) => setSyncDemoOnPreset(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
            />
            <span>Adaptar automáticamente los estudiantes de prueba únicamente a los grados del nivel seleccionado</span>
          </label>
          <span className="text-[10px] text-amber-400 font-bold hidden sm:inline-flex bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            Sincronización Dinámica
          </span>
        </div>}
      </div>

      {/* =========================================================================
          LIVE CAPACITY & STATS SUMMARY PILLS
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Niveles Activos</div>
            <div className="text-xs sm:text-sm font-serif-title font-bold text-white truncate" title={getActiveLevelsText()}>
              {getActiveLevelsText()}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Grados Habilitados</div>
            <div className="text-xs sm:text-sm font-serif-title font-bold text-white">
              {activeGrades.length} Grados
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Total Secciones</div>
            <div className="text-xs sm:text-sm font-serif-title font-bold text-white">
              {totalSections} Aulas
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Capacidad Total</div>
            <div className="text-xs sm:text-sm font-serif-title font-bold text-white">
              {totalCapacity} Vacantes
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          SUB-TABS NAVIGATION
         ========================================================================= */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('niveles')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'niveles'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>1. Niveles Educativos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('identidad')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'identidad'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Identidad & MINEDU</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('aulas')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'aulas'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. Grados y Secciones</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('asistencia')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'asistencia'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>4. Horarios & Puerta QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('periodos')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'periodos'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>5. Periodos Académicos CNEB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('perfiles')}
          className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'perfiles'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
              : 'text-orange-400/90 hover:text-white hover:bg-orange-500/10 border border-orange-500/20'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>6. Edición de Perfiles (Director & Docentes)</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: NIVELES EDUCATIVOS
         ========================================================================= */}
      {activeSubTab === 'niveles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif-title font-bold text-white">
                Modalidades y Niveles que Ofrece la Institución
              </h3>
              <p className="text-xs text-slate-400">
                Activa o desactiva los niveles según corresponda a tu colegio. Si tu institución es exclusiva de Secundaria o de Primaria, configúralo aquí con un solo toque.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Level: Inicial */}
            <div 
              onClick={() => toggleLevel('inicial')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                formData.activeLevels.includes('inicial')
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Baby className="w-5 h-5" />
                </div>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  formData.activeLevels.includes('inicial')
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {formData.activeLevels.includes('inicial') ? '✓' : ''}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-sm font-bold text-white">Educación Inicial</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Edades de 3, 4 y 5 años con evaluación cualitativa en el marco del CNEB.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Estado:</span>
                <span className={`font-bold ${formData.activeLevels.includes('inicial') ? 'text-amber-400' : 'text-slate-500'}`}>
                  {formData.activeLevels.includes('inicial') ? 'Habilitado' : 'No Impartido'}
                </span>
              </div>
            </div>

            {/* Level: Primaria */}
            <div 
              onClick={() => toggleLevel('primaria')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                formData.activeLevels.includes('primaria')
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  formData.activeLevels.includes('primaria')
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {formData.activeLevels.includes('primaria') ? '✓' : ''}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-sm font-bold text-white">Educación Primaria</h4>
                <p className="text-xs text-slate-400 mt-1">
                  1° a 6° grado. Tutoría por aula integral y docentes de áreas complementarias.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Estado:</span>
                <span className={`font-bold ${formData.activeLevels.includes('primaria') ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {formData.activeLevels.includes('primaria') ? 'Habilitado' : 'No Impartido'}
                </span>
              </div>
            </div>

            {/* Level: Secundaria */}
            <div 
              onClick={() => toggleLevel('secundaria')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                formData.activeLevels.includes('secundaria')
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  formData.activeLevels.includes('secundaria')
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {formData.activeLevels.includes('secundaria') ? '✓' : ''}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-sm font-bold text-white">Educación Secundaria</h4>
                <p className="text-xs text-slate-400 mt-1">
                  1° a 5° año. Profesores especialistas por las 11 áreas curriculares CNEB.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Estado:</span>
                <span className={`font-bold ${formData.activeLevels.includes('secundaria') ? 'text-blue-400' : 'text-slate-500'}`}>
                  {formData.activeLevels.includes('secundaria') ? 'Habilitado' : 'No Impartido'}
                </span>
              </div>
            </div>

          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Impacto en tiempo real:</strong> Al guardar, los filtros del Monitoreo QR en Puerta, la lista de docentes para supervisión y las opciones de actas SIAGIE se adaptarán de inmediato para reflejar únicamente los niveles activos configurados.
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: IDENTIDAD INSTITUCIONAL & MINEDU
         ========================================================================= */}
      {activeSubTab === 'identidad' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif-title font-bold text-white">
                Datos Oficiales de Registro ante MINEDU / SIAGIE
              </h3>
              <p className="text-xs text-slate-400">
                Información que figura en las libretas oficiales, encabezados de actas y certificados de estudios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            
            {/* Nombre Completo de la I.E. */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300">
                Nombre Oficial de la Institución Educativa
              </label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={e => updateField('institutionName', e.target.value)}
                placeholder="Ej: Colegio Privado Ryuk"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Nombre Corto */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Nombre Corto Institucional (Para encabezados y Apps)
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => updateField('shortName', e.target.value)}
                placeholder="Ej: Colegio Ryuk"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Lema institucional */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Lema o Misión Institucional
              </label>
              <input
                type="text"
                value={formData.motto}
                onChange={e => updateField('motto', e.target.value)}
                placeholder="Ej: Disciplina, Innovación y Excelencia"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Código Modular Primaria */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Código Modular Primaria (MINEDU)
              </label>
              <input
                type="text"
                value={formData.modularCodePrimaria}
                onChange={e => updateField('modularCodePrimaria', e.target.value)}
                placeholder="Ej: 1482910"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Código Modular Secundaria */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Código Modular Secundaria (MINEDU)
              </label>
              <input
                type="text"
                value={formData.modularCodeSecundaria}
                onChange={e => updateField('modularCodeSecundaria', e.target.value)}
                placeholder="Ej: 0743219"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Código de Local Escolar */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Código de Local Escolar (MINEDU)
              </label>
              <input
                type="text"
                value={formData.localCode}
                onChange={e => updateField('localCode', e.target.value)}
                placeholder="Ej: 310452"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Turno */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Turno de Funcionamiento
              </label>
              <select
                value={formData.shift}
                onChange={e => updateField('shift', e.target.value as any)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                <option value="Mañana">Turno Mañana (07:30 - 13:30)</option>
                <option value="Tarde">Turno Tarde (13:30 - 18:45)</option>
                <option value="Completa">Jornada Escolar Completa (JEC)</option>
                <option value="Doble Turno">Doble Turno (Primaria Mañana / Secundaria Tarde)</option>
              </select>
            </div>

            {/* DRE */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                DRE (Dirección Regional de Educación)
              </label>
              <input
                type="text"
                value={formData.dre}
                onChange={e => updateField('dre', e.target.value)}
                placeholder="Ej: DRE Lima Metropolitana"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* UGEL */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                UGEL Jurisdiccional
              </label>
              <input
                type="text"
                value={formData.ugel}
                onChange={e => updateField('ugel', e.target.value)}
                placeholder="Ej: UGEL 03 - Cercado"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Director General */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Director(a) General
              </label>
              <input
                type="text"
                value={formData.directorName}
                onChange={e => updateField('directorName', e.target.value)}
                placeholder="Ej: Dra. Carmen Mendoza Villena"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* DNI Director */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                DNI del Director(a)
              </label>
              <input
                type="text"
                value={formData.directorDni}
                onChange={e => updateField('directorDni', e.target.value)}
                placeholder="Ej: 09483210"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: GRADOS, SECCIONES Y AFORO
         ========================================================================= */}
      {activeSubTab === 'aulas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif-title font-bold text-white">
                  Distribución de Aulas, Secciones y Capacidad
                </h3>
                <p className="text-xs text-slate-400">
                  Configura qué secciones tiene cada grado escolar y el aforo máximo de alumnos por aula.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              Niveles mostrados: <strong className="text-amber-400 uppercase">{formData.activeLevels.join(', ')}</strong>
            </div>
          </div>

          <div className="space-y-3">
            {(formData.gradeConfigs || [])
              .filter(g => (formData.activeLevels || []).includes(g.level))
              .map(grade => (
                <div 
                  key={grade.gradeId}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    grade.enabled 
                      ? 'bg-slate-950 border-slate-800' 
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  {/* Left: Grade name & Status toggle */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => toggleGrade(grade.gradeId)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        grade.enabled 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-800 text-slate-600'
                      }`}
                      title={grade.enabled ? 'Deshabilitar grado' : 'Habilitar grado'}
                    >
                      {grade.enabled ? '✓' : ''}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {grade.gradeName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          grade.level === 'secundaria'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                            : grade.level === 'primaria'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-purple-950 text-purple-400 border border-purple-800/40'
                        }`}>
                          {grade.level}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {grade.enabled ? `${grade.sections.length} secciones activas (${grade.sections.length * grade.capacityPerSection} vacantes)` : 'Grado pausado'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Sections buttons */}
                  {grade.enabled && (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <span className="text-xs text-slate-400 font-semibold mr-1">Secciones:</span>
                      {grade.sections.map(sec => (
                        <div 
                          key={sec}
                          className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white"
                        >
                          <span>{sec}</span>
                          <button
                            type="button"
                            onClick={() => removeSection(grade.gradeId, sec)}
                            className="ml-1.5 text-slate-400 hover:text-red-400 cursor-pointer text-xs"
                            title={`Eliminar sección ${sec}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSection(grade.gradeId)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                        title="Añadir nueva sección (Ej: C, D...)"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  )}

                  {/* Right: Capacity input */}
                  {grade.enabled && (
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-slate-400 whitespace-nowrap">
                        Aforo/sección:
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={45}
                        value={grade.capacityPerSection}
                        onChange={e => updateGradeCapacity(grade.gradeId, parseInt(e.target.value) || 30)}
                        className="w-16 p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center text-xs focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500">est.</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: HORARIOS DE PUERTA & ASISTENCIA QR
         ========================================================================= */}
      {activeSubTab === 'asistencia' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif-title font-bold text-white">
                Reglas de Puntualidad y Notificaciones QR en Puerta
              </h3>
              <p className="text-xs text-slate-400">
                Define los márgenes horarios para clasificar al estudiante como "Puntual" o "Tardanza" al escanear su fotocheck QR.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                🚪 Apertura de Puertas
              </label>
              <input
                type="time"
                value={formData.doorOpeningTime}
                onChange={e => updateField('doorOpeningTime', e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Hora en que se activa la estación de escaneo en portería.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-emerald-400 block">
                ⏱️ Hora Límite Puntual
              </label>
              <input
                type="time"
                value={formData.punctualCutoffTime}
                onChange={e => updateField('punctualCutoffTime', e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Ingresos hasta esta hora son registrados con estado "Puntual".
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-amber-400 block">
                ⚠️ Tolerancia Máxima Tardanza
              </label>
              <input
                type="time"
                value={formData.lateCutoffTime}
                onChange={e => updateField('lateCutoffTime', e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Posterior a esta hora, el sistema registra como falta o derivación a Dirección.
              </p>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Automatizaciones con Apoderados y WhatsApp
            </h4>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Notificación instantánea a WhatsApp del apoderado
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Envía un mensaje de texto automático con la hora exacta al momento que el alumno marca en portería.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoWhatsAppNotification}
                  onChange={e => updateField('autoWhatsAppNotification', e.target.checked)}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Alerta preventiva de 3 tardanzas acumuladas en el mes
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Notifica al tutor de aula y a la dirección para coordinar cita con psicología escolar.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.excessiveTardinessAlert}
                  onChange={e => updateField('excessiveTardinessAlert', e.target.checked)}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 5: PERIODOS ACADÉMICOS CNEB
         ========================================================================= */}
      {activeSubTab === 'periodos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif-title font-bold text-white">
                Régimen de Evaluación y Calendario Escolar CNEB
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona si la institución califica por Bimestres o Trimestres, y cuál es el periodo actualmente abierto para el registro de calificaciones.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            
            <div className="space-y-2">
              <label className="font-semibold text-slate-300 block">
                Tipo de Régimen Académico
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateField('periodType', 'bimestral');
                    updateField('activePeriod', 'Bimestre II');
                  }}
                  className={`p-3.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    formData.periodType === 'bimestral'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Bimestral (4 Periodos)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateField('periodType', 'trimestral');
                    updateField('activePeriod', 'Trimestre I');
                  }}
                  className={`p-3.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    formData.periodType === 'trimestral'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Trimestral (3 Periodos)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-300 block">
                Periodo Actual en Curso (Habilitado para Notas)
              </label>
              <select
                value={formData.activePeriod}
                onChange={e => updateField('activePeriod', e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                {formData.periodType === 'bimestral' ? (
                  <>
                    <option value="Bimestre I">Bimestre I (Marzo - Mayo)</option>
                    <option value="Bimestre II">Bimestre II (Mayo - Julio) - [ACTUAL]</option>
                    <option value="Bimestre III">Bimestre III (Agosto - Octubre)</option>
                    <option value="Bimestre IV">Bimestre IV (Octubre - Diciembre)</option>
                  </>
                ) : (
                  <>
                    <option value="Trimestre I">Trimestre I (Marzo - Junio)</option>
                    <option value="Trimestre II">Trimestre II (Junio - Septiembre)</option>
                    <option value="Trimestre III">Trimestre III (Septiembre - Diciembre)</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-300 block">
                Año Lectivo Oficial
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={e => updateField('academicYear', e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-[11px] text-slate-300 leading-tight">
                <strong>Escala Oficial CNEB:</strong> Nivel Inicial y Primaria con evaluación formativa descriptiva (AD, A, B, C). Secundaria con escala vigesimal equivalente y competencias CNEB.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: EDICIÓN DE PERFILES (DIRECTOR Y DOCENTES)
         ========================================================================= */}
      {activeSubTab === 'perfiles' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-orange-500/20">
                <UserCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif-title font-bold text-white flex items-center gap-2">
                  <span>Edición y Actualización de Perfiles de Usuario</span>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Directores & Docentes
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Actualiza tu información personal, correo institucional, DNI, teléfono y credenciales oficiales para actas y portafolios.
                </p>
              </div>
            </div>

            {/* Role Switcher Pill */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setProfileRoleMode('director')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  profileRoleMode === 'director'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Perfil de Dirección</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileRoleMode('docente')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  profileRoleMode === 'docente'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Perfiles Docentes ({teachers.length})</span>
              </button>
            </div>
          </div>

          {/* MODE 1: DIRECTOR PROFILE */}
          {profileRoleMode === 'director' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live Executive Identity Card */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center space-y-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Avatar with Live Indicator */}
                  <div className="relative inline-block mx-auto">
                    {directorForm.avatarUrl ? (
                      <img 
                        src={directorForm.avatarUrl} 
                        alt={directorForm.name} 
                        className="w-24 h-24 rounded-3xl object-cover border-2 border-orange-500/50 shadow-xl shadow-orange-500/20"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-slate-950 font-black text-2xl flex items-center justify-center border-2 border-orange-400/40 shadow-xl shadow-orange-500/25">
                        {directorForm.name
                          .split(' ')
                          .filter(w => !w.toLowerCase().includes('dra') && !w.toLowerCase().includes('dr') && !w.toLowerCase().includes('lic') && !w.toLowerCase().includes('mg'))
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'CM'}
                      </div>
                    )}
                    <span 
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white text-[10px]"
                      title="Directivo Activo"
                    >
                      ✓
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-serif-title font-bold text-white">
                      {directorForm.name || 'Nombre del Director(a)'}
                    </h4>
                    <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                      {directorForm.role || 'Directora General'}
                    </span>
                  </div>

                  {/* Summary list */}
                  <div className="space-y-2 pt-2 border-t border-slate-800 text-left text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>DNI:</span>
                      <span className="font-mono font-bold text-white">{directorForm.dni || 'Sin registrar'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Correo:</span>
                      <span className="text-white truncate max-w-[170px]" title={directorForm.email}>{directorForm.email || 'Sin correo'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>WhatsApp:</span>
                      <span className="text-white">{directorForm.phone || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>I.E.:</span>
                      <span className="text-orange-300 font-bold truncate max-w-[170px]">{formData.shortName || formData.institutionName}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 text-left">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                      <Award className="w-3.5 h-3.5" />
                      <span>Firma Oficial para Actas:</span>
                    </div>
                    <p className="italic text-slate-300 font-mono text-[10px] leading-tight">
                      "{directorForm.signatureTitle || 'Directora General - MINEDU'}"
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-400">
                    <Info className="w-4 h-4" />
                    <span>Sincronización en Tiempo Real</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Al guardar, tu nombre y cargo se reflejarán inmediatamente en la barra superior del dashboard, en los carnets estudiantiles y en las actas oficiales generadas en formato SIAGIE.
                  </p>
                </div>
              </div>

              {/* Right Column: Director Edit Form */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-orange-400" />
                    <span>Información Personal y Profesional del Directivo</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modifica los campos y haz clic en "Guardar Perfil Directivo" para actualizar tus datos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-400" />
                      <span>Nombres y Apellidos Completos *</span>
                    </label>
                    <input
                      type="text"
                      value={directorForm.name}
                      onChange={e => setDirectorForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej. Dra. Carmen Mendoza Villena"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Official Role */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                      <span>Cargo / Función Directiva *</span>
                    </label>
                    <input
                      type="text"
                      value={directorForm.role}
                      onChange={e => setDirectorForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Ej. Directora General"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* DNI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-orange-400" />
                      <span>Documento de Identidad (DNI) *</span>
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={directorForm.dni}
                      onChange={e => setDirectorForm(prev => ({ ...prev, dni: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Ej. 09483210"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-orange-400" />
                      <span>Correo Institucional *</span>
                    </label>
                    <input
                      type="email"
                      value={directorForm.email}
                      onChange={e => setDirectorForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Ej. direccion@colegio-ryuk.edu.pe"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-400" />
                      <span>Celular / WhatsApp Oficial</span>
                    </label>
                    <input
                      type="text"
                      value={directorForm.phone}
                      onChange={e => setDirectorForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ej. +51 984 512 340"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Specialty */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-orange-400" />
                      <span>Especialidad Pedagógica / Grado Académico</span>
                    </label>
                    <input
                      type="text"
                      value={directorForm.specialty}
                      onChange={e => setDirectorForm(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="Ej. Doctora en Ciencias de la Educación - Gestión y Auditoría CNEB"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Signature Title for Actas */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-orange-400" />
                      <span>Resolución Directoral y Rótulo para Actas Oficiales SIAGIE</span>
                    </label>
                    <input
                      type="text"
                      value={directorForm.signatureTitle}
                      onChange={e => setDirectorForm(prev => ({ ...prev, signatureTitle: e.target.value }))}
                      placeholder="Ej. Directora General - R.D. N° 0482-2026-UGEL 03"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Avatar URL / Options */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      <span>Fotografía o Enlace de Avatar (opcional)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={directorForm.avatarUrl || ''}
                        onChange={e => setDirectorForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                        placeholder="https://ejemplo.com/mifoto.jpg (deja vacío para avatar con iniciales)"
                        className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                      />
                      {directorForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setDirectorForm(prev => ({ ...prev, avatarUrl: '' }))}
                          className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                          title="Restablecer a iniciales"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save Director Profile Action */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    * Campos obligatorios para identificación institucional.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!directorForm.name.trim()) {
                        onToast('El nombre del directivo no puede estar vacío');
                        return;
                      }
                      if (onUpdateDirectorProfile) {
                        onUpdateDirectorProfile(directorForm);
                      }
                      // Also sync institutional config fields
                      setFormData(prev => ({
                        ...prev,
                        directorName: directorForm.name,
                        directorDni: directorForm.dni,
                      }));
                      onSaveConfig({
                        ...formData,
                        directorName: directorForm.name,
                        directorDni: directorForm.dni,
                      });
                      onToast(`✓ Perfil directivo de ${directorForm.name} guardado y aplicado`);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs sm:text-sm hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Mi Perfil Directivo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: TEACHERS PROFILES */}
          {profileRoleMode === 'docente' && (
            <div className="space-y-6">
              {/* Teacher Selector Ribbon */}
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>Seleccionar Docente a Editar ({teachers.length} registrados)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Elige al docente que desea actualizar su información personal o pedagógica.
                    </p>
                  </div>

                  {/* Quick search input */}
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={teacherSearchTerm}
                      onChange={e => setTeacherSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o DNI..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Teachers Chips Carousel */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {teachers
                    .filter(t => 
                      !teacherSearchTerm || 
                      t.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                      (t.dni && t.dni.includes(teacherSearchTerm)) ||
                      t.area.toLowerCase().includes(teacherSearchTerm.toLowerCase())
                    )
                    .map(teacher => {
                      const isSelected = selectedTeacherId === teacher.id;
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(teacher.id);
                            setTeacherForm({ ...teacher });
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all cursor-pointer whitespace-nowrap shrink-0 text-left ${
                            isSelected
                              ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/60 ring-1 ring-orange-500/40 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-orange-400 shrink-0 overflow-hidden">
                            {teacher.avatarUrl ? (
                              <img src={teacher.avatarUrl} alt={teacher.name} className="w-full h-full object-cover" />
                            ) : (
                              teacher.name.split(' ').map(p => p[0]).slice(0, 2).join('')
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold block leading-tight text-white">
                              {teacher.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block leading-tight">
                              {teacher.area} ({teacher.level})
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Teacher Edit Form & Preview */}
              {teacherForm ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Teacher Card Preview */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-center relative overflow-hidden">
                      <div className="w-20 h-20 rounded-2xl mx-auto bg-slate-950 border-2 border-slate-700 overflow-hidden shadow-lg flex items-center justify-center font-black text-xl text-orange-400">
                        {teacherForm.avatarUrl ? (
                          <img src={teacherForm.avatarUrl} alt={teacherForm.name} className="w-full h-full object-cover" />
                        ) : (
                          teacherForm.name.split(' ').map(p => p[0]).slice(0, 2).join('')
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {teacherForm.name || 'Nombre del Docente'}
                        </h4>
                        <span className="text-xs text-orange-400 font-semibold block mt-0.5">
                          {teacherForm.area || 'Área Curricular'}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            Nivel {teacherForm.level || 'Secundaria'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            teacherForm.status === 'Al día' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : teacherForm.status === 'En proceso'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {teacherForm.status}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 text-left text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>DNI:</span>
                          <span className="font-mono font-bold text-white">{teacherForm.dni || 'Sin registrar'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Correo:</span>
                          <span className="text-white truncate max-w-[170px]" title={teacherForm.email}>{teacherForm.email || 'Sin correo'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Teléfono:</span>
                          <span className="text-white">{teacherForm.phone || 'Sin registrar'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Grados:</span>
                          <span className="text-white font-semibold">{teacherForm.grades || 'No asignados'}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-left space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Avance Portafolio CNEB:</span>
                          <span className="font-bold text-emerald-400 font-mono">{teacherForm.portfolioProgress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${teacherForm.portfolioProgress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Teacher Edit Fields */}
                  <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-orange-400" />
                        <span>Ficha y Datos Personales del Docente</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Actualiza la información del profesor seleccionado en la nómina institucional.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-orange-400" />
                          <span>Nombres y Apellidos Completos *</span>
                        </label>
                        <input
                          type="text"
                          value={teacherForm.name}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                          placeholder="Ej. Prof. Carlos Huamán Quispe"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>

                      {/* DNI */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <IdCard className="w-3.5 h-3.5 text-orange-400" />
                          <span>DNI del Docente *</span>
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          value={teacherForm.dni || ''}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, dni: e.target.value.replace(/\D/g, '') }) : null)}
                          placeholder="Ej. 41258963"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-orange-400" />
                          <span>Correo Institucional *</span>
                        </label>
                        <input
                          type="email"
                          value={teacherForm.email || ''}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                          placeholder="Ej. c.huaman@colegio-ryuk.edu.pe"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-orange-400" />
                          <span>Teléfono / WhatsApp</span>
                        </label>
                        <input
                          type="text"
                          value={teacherForm.phone || ''}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                          placeholder="Ej. +51 987 654 321"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Level */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-orange-400" />
                          <span>Nivel Educativo</span>
                        </label>
                        <select
                          value={teacherForm.level}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, level: e.target.value }) : null)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        >
                          <option value="Secundaria">Nivel Secundaria</option>
                          <option value="Primaria">Nivel Primaria</option>
                          <option value="Inicial">Nivel Inicial</option>
                        </select>
                      </div>

                      {/* Area Curricular CNEB */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                          <span>Área Curricular CNEB</span>
                        </label>
                        <select
                          value={teacherForm.area}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, area: e.target.value }) : null)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        >
                          <option value="Matemática y Cálculo">Matemática y Cálculo</option>
                          <option value="Comunicación y Literatura">Comunicación y Literatura</option>
                          <option value="Ciencia y Tecnología">Ciencia y Tecnología</option>
                          <option value="Ciencias Sociales e Historia">Ciencias Sociales e Historia</option>
                          <option value="Desarrollo Personal, Ciudadanía y Cívica">Desarrollo Personal, Ciudadanía y Cívica</option>
                          <option value="Inglés Técnico / Lengua Extranjera">Inglés Técnico / Lengua Extranjera</option>
                          <option value="Educación para el Trabajo (Robótica/TIC)">Educación para el Trabajo (Robótica/TIC)</option>
                          <option value="Educación Física y Deportes">Educación Física y Deportes</option>
                          <option value="Arte, Música y Cultura">Arte, Música y Cultura</option>
                          <option value="Tutoría y Orientación Educativa">Tutoría y Orientación Educativa</option>
                        </select>
                      </div>

                      {/* Assigned Grades */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Grados y Secciones a Cargo</span>
                        </label>
                        <input
                          type="text"
                          value={teacherForm.grades}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, grades: e.target.value }) : null)}
                          placeholder="Ej. 1°, 2° y 3° Secundaria"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Portfolio Status */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Estado de Supervisión CNEB</span>
                        </label>
                        <select
                          value={teacherForm.status}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        >
                          <option value="Al día">Al día (Cumplimiento 100%)</option>
                          <option value="En proceso">En proceso (Subiendo evidencias)</option>
                          <option value="Pendiente">Pendiente (Requiere visado)</option>
                        </select>
                      </div>

                      {/* Photo URL */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-orange-400" />
                          <span>Foto o Avatar URL</span>
                        </label>
                        <input
                          type="url"
                          value={teacherForm.avatarUrl || ''}
                          onChange={e => setTeacherForm(prev => prev ? ({ ...prev, avatarUrl: e.target.value }) : null)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Save Teacher Action */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Los cambios impactan de inmediato en la sección de Supervisión de Docentes.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!teacherForm.name.trim()) {
                            onToast('El nombre del docente no puede estar vacío');
                            return;
                          }
                          if (onUpdateTeacher) {
                            onUpdateTeacher(teacherForm);
                          }
                          onToast(`✓ Ficha del docente ${teacherForm.name} actualizada`);
                        }}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs sm:text-sm hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer shadow-lg shadow-orange-500/25 active:scale-95 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Actualizar Perfil del Docente</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800">
                  <p className="text-sm text-slate-400">Selecciona un docente arriba para editar su perfil.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          BOTTOM DOCKED BAR FOR SAVING
         ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-white block">
              {formData.shortName || formData.institutionName}
            </span>
            <span className="text-[11px] text-slate-400">
              Modalidad: {getActiveLevelsText()} · {activeGrades.length} Grados ({totalSections} Aulas)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer transition-colors"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

    </div>
  );
}

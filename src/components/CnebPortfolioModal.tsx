import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Award,
  BookOpen,
  Calendar,
  User,
  Building2,
  FileText,
  Layers,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { TeacherPortfolioItem } from '../types/education';

interface CnebPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeacherPortfolioItem | null;
}

export default function CnebPortfolioModal({
  isOpen,
  onClose,
  item,
}: CnebPortfolioModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!item) return;
    const generateQr = async () => {
      try {
        const payload = `CNEB-MINEDU-PORTAFOLIO//DOCENTE:${item.teacherName || 'DOCENTE'}//AREA:${item.cnebArea}//ID:${item.id}//VISADO:VALIDO`;
        const url = await QRCode.toDataURL(payload, {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating CNEB QR code:', err);
      }
    };
    generateQr();
  }, [item]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Control Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
              Expediente CNEB · Carpeta Pedagógica y Portafolio Docente
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Imprimir Carpeta CNEB"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isExporting}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>¡Descargado!</span>
                </>
              ) : (
                <>
                  <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">{isExporting ? 'Generando...' : 'Descargar PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content Area */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto space-y-6">
          
          {/* Institutional Document Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-serif font-black text-2xl shadow-sm shrink-0">
                  R
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase">
                    Sistema Institucional Educativo Ryuk
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    Alineado al Currículo Nacional de la Educación Básica (CNEB) del Perú · R.M. N° 649-2016-MINEDU
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500 shrink-0">
                <span className="font-mono font-bold text-slate-800 block">ID: {item.id}</span>
                <span>Registro de Carpeta Pedagógica 2026</span>
              </div>
            </div>
          </div>

          {/* Dossier Banner Title */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
                {item.cnebArea}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-800">
                {item.category}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {item.status}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {item.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[11px]">Docente Responsable:</span>
              <span className="text-slate-900 font-bold">{item.teacherName || 'Docente Especialista CNEB'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[11px]">Nivel y Grado Escolar:</span>
              <span className="text-slate-900 font-bold">{item.gradeTarget}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[11px]">Secciones Asignadas:</span>
              <span className="text-slate-900 font-bold">{item.sectionTarget || 'Primaria y Secundaria'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[11px]">Fecha de Actualización:</span>
              <span className="text-slate-900 font-bold">{item.updatedAt}</span>
            </div>
          </div>

          {/* Section 1: Propósito de Aprendizaje y Situación Significativa */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-200 pb-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              1. Propósito de Aprendizaje CNEB
            </h3>
            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200/80 text-xs text-slate-800 leading-relaxed">
              <span className="font-bold text-orange-950 block mb-1">Propósito de la Sesión / Unidad:</span>
              <p>{item.learningPurpose}</p>
            </div>
          </div>

          {/* Section 2: Matriz de Competencias y Capacidades CNEB */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-200 pb-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              2. Competencia y Capacidades del Área ({item.cnebArea})
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-bold block text-[11px] uppercase">Competencia CNEB Priorizada:</span>
                <p className="text-slate-900 font-bold text-sm mt-0.5">{item.competency}</p>
              </div>

              <div>
                <span className="text-slate-500 font-bold block text-[11px] uppercase mb-1.5">Capacidades Articuladas:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Criterios de Evaluación y Evidencias */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-200 pb-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              3. Criterios de Evaluación y Evidencias de Aprendizaje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="text-slate-500 font-bold block text-[11px] uppercase">Criterio de Evaluación / Desempeño Precisado:</span>
                <p className="text-slate-800 leading-relaxed font-medium">{item.performanceCriterion}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="text-slate-500 font-bold block text-[11px] uppercase">Evidencia Tangible de Aprendizaje:</span>
                <p className="text-slate-800 leading-relaxed font-medium">{item.evidenceDescription}</p>
                <div className="pt-2 text-[11px] text-slate-500 font-semibold">
                  Instrumento: <span className="text-slate-800">{item.evaluationInstrument}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Rúbrica Formativa Oficial CNEB (AD, A, B, C) */}
          {item.rubric && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-200 pb-2">
                <Award className="w-4 h-4 text-purple-600" />
                4. Rúbrica Analítica Oficial por Niveles de Logro CNEB
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                {/* AD */}
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-purple-600 text-white">AD</span>
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Logro Destacado</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed pt-1">
                    {item.rubric.AD}
                  </p>
                </div>

                {/* A */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-blue-600 text-white">A</span>
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Logro Esperado</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed pt-1">
                    {item.rubric.A}
                  </p>
                </div>

                {/* B */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-amber-600 text-white">B</span>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">En Proceso</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed pt-1">
                    {item.rubric.B}
                  </p>
                </div>

                {/* C */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-rose-600 text-white">C</span>
                    <span className="text-[10px] font-bold text-rose-700 uppercase">En Inicio</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed pt-1">
                    {item.rubric.C}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Official Seal and Verification */}
          <div className="mt-6 pt-6 border-t-2 border-slate-900/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              
              {/* Seal Column 1: QR */}
              <div className="flex items-center gap-3">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Código QR de verificación CNEB"
                    className="w-20 h-20 rounded-lg border border-slate-300 p-1 bg-white shrink-0"
                  />
                )}
                <div className="text-[11px] text-slate-500">
                  <span className="font-bold text-slate-800 block">Sello QR Institucional</span>
                  <span>Verificación digital directa por MINEDU / UGEL y Coordinación.</span>
                </div>
              </div>

              {/* Seal Column 2: Visado Digital */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-1.5 justify-center sm:justify-start font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Visado Digital Autorizado</span>
                </div>
                <div className="text-[11px]">
                  <span>Por: <strong>{item.visadoBy || 'Coordinación Pedagógica CNEB'}</strong></span>
                </div>
                <div className="text-[10px] text-emerald-700 font-mono">
                  Fecha de visado: {item.visadoDate || item.updatedAt}
                </div>
              </div>

              {/* Seal Column 3: Firmas */}
              <div className="text-center sm:text-right text-xs text-slate-600">
                <div className="h-10 flex items-end justify-center sm:justify-end pb-1">
                  <div className="w-40 border-b border-slate-400 font-serif italic text-xs text-slate-800">
                    Sello Digital CNEB
                  </div>
                </div>
                <span className="font-bold block text-slate-800 text-[11px]">Dirección y Coordinación Pedagógica</span>
                <span className="text-[10px] text-slate-500">Escuelas y Colegios del Perú</span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>{item.filesCount} archivos pedagógicos digitalizados vinculados a esta carpeta CNEB</span>
          <span className="font-semibold text-slate-700">Sistema Institucional Ryuk · Transformación Escolar Digital</span>
        </div>

      </div>
    </div>
  );
}

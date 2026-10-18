import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X } from 'lucide-react';
import { Student } from '../types/education';
import { InstitutionConfig, DirectorProfile } from '../types/institution';
import { CNEB_AREAS, compUnitsOf, findGrade, levelOf, overallLiteral, periodCount, periodLabel, statusOf, unitsOf } from '../lib/school';
import { competenciasOf } from '../lib/cneb';

/** Libreta de notas imprimible (o guardable como PDF desde el navegador). */
export default function ReportCard({ student, config, profile, onClose }: { student: Student; config: InstitutionConfig; profile: DirectorProfile; onClose: () => void }) {
  const [qr, setQr] = useState('');
  const n = periodCount(config);
  const level = levelOf(student);
  const areas = [...new Set([...CNEB_AREAS[level], ...(student.grades || []).map((g) => g.courseName)])];
  const modular = level === 'primaria' ? config.modularCodePrimaria : config.modularCodeSecundaria;
  const overall = overallLiteral(student);

  useEffect(() => {
    QRCode.toDataURL(student.qrCodeValue, { width: 160, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [student.qrCodeValue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 p-0 sm:p-6 print:p-0 print:bg-white" role="dialog" aria-modal="true" aria-label={`Libreta de ${student.fullName}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end gap-2 p-3 sm:p-0 sm:mb-3 print:hidden">
          <button type="button" onClick={() => window.print()} className="h-11 px-4 rounded-xl bg-orange-600 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"><Printer className="w-4 h-4" /> Imprimir o guardar PDF</button>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <article className="print-area bg-white text-slate-900 sm:rounded-2xl p-5 sm:p-10 text-[13px] leading-relaxed">
          <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Informe de progreso del estudiante · {config.academicYear}</p>
              <h1 className="text-xl font-bold mt-1">{config.institutionName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {[modular && `Cód. modular ${modular}`, config.ugel, config.dre].filter(Boolean).join(' · ') || ' '}
              </p>
            </div>
            {qr && <img src={qr} alt="QR del portal del estudiante" className="w-20 h-20 shrink-0" />}
          </header>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-200 text-xs">
            <div><span className="block text-slate-500">Estudiante</span><strong>{student.fullName}</strong></div>
            <div><span className="block text-slate-500">DNI</span><strong>{student.dni || '—'}</strong></div>
            <div><span className="block text-slate-500">Grado y sección</span><strong>{student.gradeLevel} {student.section}</strong></div>
            <div><span className="block text-slate-500">Nivel</span><strong className="capitalize">{level}</strong></div>
          </section>

          <table className="w-full mt-4 border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border border-slate-300">Área curricular</th>
                {Array.from({ length: n }, (_, i) => <th key={i} className="p-2 border border-slate-300 w-14">{periodLabel(config, i)}</th>)}
                <th className="p-2 border border-slate-300 w-16">Final</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => {
                const g = findGrade(student, a);
                const comps = competenciasOf(a, level);
                return [
                  <tr key={a} className="bg-slate-50/60">
                    <td className="p-2 border border-slate-300">
                      <span className="font-semibold">{a}</span>
                      {g?.recentFeedback && <span className="block text-[11px] text-slate-600 mt-0.5">{g.recentFeedback}</span>}
                    </td>
                    {unitsOf(g, n).map((v, i) => <td key={i} className="p-2 border border-slate-300 text-center font-bold">{v || '—'}</td>)}
                    <td className="p-2 border border-slate-300 text-center font-bold bg-slate-100">{g?.average || '—'}</td>
                  </tr>,
                  ...comps.filter((c) => compUnitsOf(g, c.id, n).some(Boolean)).map((c) => (
                    <tr key={`${a}-${c.id}`}>
                      <td className="py-1.5 px-2 pl-5 border border-slate-300 text-[11px] text-slate-600">{c.name}</td>
                      {compUnitsOf(g, c.id, n).map((v, i) => <td key={i} className="py-1.5 px-2 border border-slate-300 text-center text-[11px]">{v || '—'}</td>)}
                      <td className="py-1.5 px-2 border border-slate-300" />
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>

          <section className="grid sm:grid-cols-2 gap-4 mt-5">
            <div className="p-3 rounded-lg border border-slate-300">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Asistencia del año</p>
              <p className="mt-1">
                Días registrados: <strong>{student.totalDays}</strong> · Puntual: <strong>{student.presentDays}</strong> · Tardanzas: <strong>{student.lateDays}</strong> · Faltas: <strong>{student.absentDays}</strong>
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-300">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nivel de logro general</p>
              <p className="mt-1"><strong>{overall || '—'}</strong> {overall && `· ${statusOf(overall)}`}</p>
            </div>
          </section>

          <p className="mt-4 text-[11px] text-slate-500">Escala CNEB: AD = logro destacado · A = logro esperado · B = en proceso · C = en inicio.</p>

          <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-xs">
            <div><div className="border-t border-slate-500 pt-1.5">Tutor(a)</div></div>
            <div><div className="border-t border-slate-500 pt-1.5">{profile.name || 'Dirección'}<span className="block text-slate-500">{profile.signatureTitle || 'Director(a)'}</span></div></div>
          </footer>
          <p className="mt-6 text-[10px] text-slate-400 text-center">Emitido el {new Date().toLocaleDateString('es-PE')} con Ryuk · El QR abre el reporte actualizado del estudiante.</p>
        </article>
      </div>
    </div>
  );
}

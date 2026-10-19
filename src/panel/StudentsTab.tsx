import { FormEvent, useMemo, useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet, IdCard, KeyRound, Pencil, Printer, Search, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Student } from '../types/education';
import { InstitutionConfig } from '../types/institution';
import { Avatar, btn, Card, Empty, input, Modal, PageHeader } from './ui';
import { aulaOf, downloadCsv, levelOf } from '../lib/school';
import { LEVEL_LABEL } from '../lib/cneb';
import { gradeOptions, parseRoster } from '../lib/roster';
import StudentQrCanvas from '../components/StudentQrCanvas';
import { AulaFolders, FolderBack } from './Folders';

const blank = (): Student => ({
  id: '', qrCodeValue: '', fullName: '', enrollmentCode: '', gradeLevel: '', section: '', avatarUrl: '', institutionName: '', academicYear: '',
  attendanceRate: 0, totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, grades: [], dni: '', parentName: '', parentPhone: '', address: '',
});

export default function StudentsTab({ ctx }: { ctx: PanelCtx }) {
  const { students, config, isDirector } = ctx;
  const [q, setQ] = useState('');
  const [aula, setAula] = useState('');
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);
  const [printing, setPrinting] = useState<{ kind: 'carnet' | 'codes'; list: Student[] } | null>(null);

  const aulas = useMemo(() => [...new Set(students.map(aulaOf))].sort(), [students]);
  const list = students
    .filter((s) => (aula ? aulaOf(s) === aula : true))
    .filter((s) => `${s.fullName} ${s.dni || ''} ${aulaOf(s)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => aulaOf(a).localeCompare(aulaOf(b)) || a.fullName.localeCompare(b.fullName));

  // Con varias aulas se entra por carpetas; al buscar, se busca en todo el colegio.
  const showFolders = aulas.length > 1 && !aula && !q.trim();

  const exportList = () => downloadCsv('estudiantes.csv', [
    ['Estudiante', 'DNI', 'Nivel', 'Grado', 'Sección', 'Apoderado', 'Celular', 'Código estudiante', 'Código familia', 'Asistencia %'],
    ...list.map((s) => [s.fullName, s.dni || '', LEVEL_LABEL[levelOf(s)], s.gradeLevel, s.section, s.parentName || '', s.parentPhone || '', s.studentCode || '', s.familyCode || '', s.totalDays ? s.attendanceRate : '']),
  ]);

  return (
    <div className="space-y-6 stagger">
      <PageHeader
        title="Estudiantes"
        subtitle={`${students.length} estudiantes matriculados${aulas.length ? ` en ${aulas.length} aulas` : ''}`}
        actions={isDirector ? (
          <>
            <button type="button" onClick={() => setEditing(blank())} className={btn.primary}><UserPlus className="w-4 h-4" /> Nuevo estudiante</button>
            <button type="button" onClick={() => setImporting(true)} className={btn.secondary}><FileSpreadsheet className="w-4 h-4" /> Importar nómina</button>
          </>
        ) : undefined}
      />

      {students.length === 0 ? (
        <Empty icon={Users} title="Aún no hay estudiantes"
          action={isDirector ? <><button type="button" onClick={() => setEditing(blank())} className={btn.primary}><UserPlus className="w-4 h-4" /> Registrar el primero</button><button type="button" onClick={() => setImporting(true)} className={btn.secondary}><Upload className="w-4 h-4" /> Importar desde Excel</button></> : undefined}>
          {isDirector ? 'Cada estudiante recibe su carnet con QR y dos códigos: uno para su cuenta y otro para su familia.' : 'La dirección todavía no registró la nómina.'}
        </Empty>
      ) : (
        <>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI o aula" className={`${input} pl-9`} aria-label="Buscar estudiante" />
        </div>
        {aula && <FolderBack name={aula} onBack={() => setAula('')} />}
        {showFolders ? (
          <AulaFolders items={aulas.map((a) => ({ name: a, count: students.filter((s) => aulaOf(s) === a).length }))} onOpen={setAula} />
        ) : (
        <Card className="overflow-hidden">
          {isDirector && (
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPrinting({ kind: 'carnet', list })} className={btn.ghost}><IdCard className="w-4 h-4" /> Carnets ({list.length})</button>
              <button type="button" onClick={() => setPrinting({ kind: 'codes', list })} className={btn.ghost}><KeyRound className="w-4 h-4" /> Códigos de acceso ({list.length})</button>
              <button type="button" onClick={exportList} className={btn.ghost}><Download className="w-4 h-4" /> Exportar</button>
            </div>
          )}
          <ul className="divide-y divide-slate-800">
            {list.slice(0, 500).map((s) => (
              <li key={s.id} className="p-3 sm:px-5 flex items-center gap-3">
                <Avatar src={s.avatarUrl} name={s.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{s.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{aulaOf(s)} · Asistencia {s.totalDays ? `${s.attendanceRate}%` : '—'}{s.dni ? ` · DNI ${s.dni}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={s.qrCodeValue} target="_blank" rel="noopener noreferrer" className={btn.ghost} aria-label={`Ver portal de ${s.fullName}`} title="Ver lo que ve la familia"><ExternalLink className="w-4 h-4" /></a>
                  {isDirector && (
                    <>
                      <button type="button" onClick={() => setPrinting({ kind: 'carnet', list: [s] })} className={btn.ghost} aria-label={`Carnet de ${s.fullName}`}><IdCard className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditing(s)} className={btn.ghost} aria-label={`Editar a ${s.fullName}`}><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleting(s)} className={btn.ghost} aria-label={`Retirar a ${s.fullName}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No hay estudiantes con ese filtro.</p>}
          {list.length > 500 && <p className="p-3 text-center text-xs text-slate-500">Mostrando 500 de {list.length}. Usa el buscador o abre un aula.</p>}
        </Card>
        )}
        </>
      )}

      {editing && (
        <StudentForm
          student={editing}
          config={config}
          onClose={() => setEditing(null)}
          onReplaceQr={editing.id ? async () => { await ctx.replaceQr(editing); setEditing(null); } : undefined}
          onSave={async (s) => {
            setEditing(null);
            if (s.id) await ctx.saveStudents([s], `Datos de ${s.fullName} actualizados.`);
            else await ctx.addStudents([s], `${s.fullName} matriculado(a). Su carnet y sus códigos ya están listos.`);
            if (aulas.length > 0) setAula(aulaOf(s));
          }}
        />
      )}

      {importing && <ImportModal config={config} onClose={() => setImporting(false)} onImport={async (l) => { setImporting(false); await ctx.addStudents(l, `Se matricularon ${l.length} estudiantes.`); }} />}

      {deleting && (
        <Modal title={`¿Retirar a ${deleting.fullName}?`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-300">Se borran su ficha, su historial de asistencia y sus notas. Su carnet y sus códigos dejan de funcionar. No se puede deshacer.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDeleting(null)} className={btn.ghost}>Cancelar</button>
            <button type="button" className={btn.danger} onClick={async () => { const s = deleting; setDeleting(null); await ctx.removeStudent(s); }}>Sí, retirar</button>
          </div>
        </Modal>
      )}

      {printing && <PrintSheet kind={printing.kind} list={printing.list} config={config} onClose={() => setPrinting(null)} />}
    </div>
  );
}

function StudentForm({ student, config, onClose, onSave, onReplaceQr }: {
  student: Student; config: InstitutionConfig; onClose: () => void; onSave: (s: Student) => void; onReplaceQr?: () => void;
}) {
  const grades = gradeOptions(config);
  const [s, setS] = useState<Student>(() => (student.gradeLevel ? student : { ...student, gradeLevel: grades[0]?.gradeName || '', section: grades[0]?.sections[0] || 'A' }));
  const set = <K extends keyof Student>(k: K, v: Student[K]) => setS((p) => ({ ...p, [k]: v }));
  const gc = grades.find((g) => g.gradeName === s.gradeLevel);
  const sections = gc?.sections.length ? gc.sections : ['A'];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const level = gc?.level || levelOf(s);
    onSave({ ...s, fullName: s.fullName.trim().replace(/\s+/g, ' '), educationalLevel: level === 'primaria' ? 'Primaria' : 'Secundaria', institutionName: config.institutionName, academicYear: config.academicYear });
  };
  const field = (label: string, k: 'fullName' | 'dni' | 'parentName' | 'parentPhone' | 'address' | 'enrollmentCode', type = 'text', extra: Record<string, unknown> = {}) => (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor={`st-${k}`}>{label}</label>
      <input id={`st-${k}`} type={type} value={(s[k] as string) || ''} onChange={(e) => set(k, e.target.value)} className={input} {...extra} />
    </div>
  );

  return (
    <Modal title={student.id ? 'Editar estudiante' : 'Nuevo estudiante'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">{field('Apellidos y nombres', 'fullName', 'text', { required: true, minLength: 3, autoFocus: true })}</div>
          {field('DNI', 'dni', 'text', { inputMode: 'numeric', pattern: '[0-9]{8}', title: '8 dígitos' })}
          {field('Código de matrícula (SIAGIE)', 'enrollmentCode')}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="st-grade">Grado</label>
            <select id="st-grade" value={s.gradeLevel} onChange={(e) => { const g = grades.find((x) => x.gradeName === e.target.value); setS((p) => ({ ...p, gradeLevel: e.target.value, section: g?.sections[0] || 'A' })); }} className={input} required>
              {!gc && s.gradeLevel && <option value={s.gradeLevel}>{s.gradeLevel}</option>}
              {grades.map((g) => <option key={g.gradeId} value={g.gradeName}>{g.gradeName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="st-section">Sección</label>
            <select id="st-section" value={s.section} onChange={(e) => set('section', e.target.value)} className={input} required>
              {!sections.includes(s.section) && s.section && <option value={s.section}>{s.section}</option>}
              {sections.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          {field('Padre, madre o apoderado(a)', 'parentName')}
          {field('Celular del apoderado(a)', 'parentPhone', 'tel', { inputMode: 'tel' })}
          <div className="sm:col-span-2">{field('Dirección', 'address')}</div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="st-gender">Sexo</label>
            <select id="st-gender" value={s.gender || ''} onChange={(e) => set('gender', (e.target.value || undefined) as Student['gender'])} className={input}>
              <option value="">—</option><option value="F">Mujer</option><option value="M">Hombre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="st-birth">Fecha de nacimiento</label>
            <input id="st-birth" type="date" value={s.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} className={input} />
          </div>
        </div>
        {onReplaceQr && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-400">¿Perdió su carnet? Genera un QR nuevo y el anterior deja de funcionar al instante.</p>
            <button type="button" onClick={onReplaceQr} className={btn.secondary}>Generar QR nuevo</button>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" className={btn.primary}>{student.id ? 'Guardar cambios' : 'Matricular'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({ config, onClose, onImport }: { config: InstitutionConfig; onClose: () => void; onImport: (l: Student[]) => void }) {
  const [text, setText] = useState('');
  const rows = useMemo(() => parseRoster(text, config), [text, config]);
  const ok = rows.filter((r) => !r.error);

  const onFile = (f?: File) => { if (f) f.text().then(setText); };

  const run = () => onImport(ok.map((r) => {
    const gc = config.gradeConfigs.find((g) => g.gradeName === r.gradeLevel)!;
    return {
      ...blank(), fullName: r.fullName, dni: r.dni, gradeLevel: r.gradeLevel, section: r.section, parentName: r.parentName, parentPhone: r.parentPhone,
      educationalLevel: gc.level === 'primaria' ? 'Primaria' : 'Secundaria', institutionName: config.institutionName, academicYear: config.academicYear,
    };
  }));

  return (
    <Modal title="Importar nómina" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">Copia las columnas desde Excel (o el SIAGIE) y pégalas aquí, en este orden:</p>
        <p className="text-xs font-mono text-orange-200 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-x-auto whitespace-nowrap">DNI · Apellidos y nombres · Nivel · Grado · Sección · Apoderado · Celular</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} aria-label="Filas de la nómina" placeholder="Pega aquí las filas de tu nómina"
          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-orange-500" />
        <label className={`${btn.secondary} w-full sm:w-auto`}>
          <Upload className="w-4 h-4" /> O sube un archivo .csv
          <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {rows.length > 0 && (
          <div className="rounded-xl border border-slate-800 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0"><tr><th className="text-left p-2">Estudiante</th><th className="text-left p-2">Aula</th><th className="text-left p-2">Estado</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 text-slate-200">{r.fullName || '—'}</td>
                    <td className="p-2 text-slate-400">{r.gradeLevel ? `${r.gradeLevel} · ${r.section}` : '—'}</td>
                    <td className={`p-2 font-semibold ${r.error ? 'text-rose-300' : 'text-emerald-300'}`}>{r.error || 'Listo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="button" onClick={run} disabled={!ok.length} className={btn.primary}>Matricular {ok.length || ''}</button>
        </div>
      </div>
    </Modal>
  );
}

function PrintSheet({ kind, list, config, onClose }: { kind: 'carnet' | 'codes'; list: Student[]; config: InstitutionConfig; onClose: () => void }) {
  const school = config.shortName || config.institutionName;
  const app = `${window.location.host}/app`;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 print:bg-white" role="dialog" aria-modal="true" aria-label={kind === 'carnet' ? 'Carnets' : 'Códigos de acceso'}>
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <div className="flex justify-between items-center gap-2 mb-3 print:hidden">
          <p className="text-sm text-slate-300">{kind === 'carnet' ? 'Carnets con QR para la asistencia y el portal de la familia.' : 'Entrega a cada estudiante y a su familia su código. Son personales.'}</p>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => window.print()} className={btn.primary}><Printer className="w-4 h-4" /> Imprimir</button>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="print-area bg-white text-slate-900 rounded-2xl p-4 sm:p-6 grid sm:grid-cols-2 gap-4">
          {list.map((s) => kind === 'carnet' ? (
            <div key={s.id} className="rounded-2xl border-2 border-slate-900 overflow-hidden break-inside-avoid">
              <div className="bg-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold truncate">{school}</span>
                <span className="text-[10px] text-orange-300 font-bold">{config.academicYear}</span>
              </div>
              <div className="p-4 flex items-center gap-4">
                <StudentQrCanvas value={s.qrCodeValue} size={112} />
                <div className="min-w-0">
                  <p className="font-bold leading-tight">{s.fullName}</p>
                  <p className="text-xs text-slate-600 mt-1">{s.gradeLevel} · Sección {s.section}</p>
                  {s.dni && <p className="text-xs text-slate-500 mt-0.5">DNI {s.dni}</p>}
                  <p className="text-[10px] text-slate-400 mt-2">Escanéalo para registrar el ingreso o ver el reporte del estudiante.</p>
                </div>
              </div>
            </div>
          ) : (
            <div key={s.id} className="rounded-2xl border border-slate-300 p-4 break-inside-avoid text-sm">
              <p className="font-bold">{s.fullName}</p>
              <p className="text-xs text-slate-500">{school} · {s.gradeLevel} {s.section}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-100 p-2.5"><p className="text-[10px] uppercase font-bold text-slate-500">Estudiante</p><p className="font-mono font-bold tracking-widest">{s.studentCode || '—'}</p></div>
                <div className="rounded-xl bg-orange-50 p-2.5"><p className="text-[10px] uppercase font-bold text-orange-700">Familia</p><p className="font-mono font-bold tracking-widest">{s.familyCode || '—'}</p></div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Crea tu cuenta en <strong>{app}</strong>, elige “Unirme con un código” y escribe el tuyo.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

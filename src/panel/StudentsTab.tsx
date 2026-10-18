import { FormEvent, useState } from 'react';
import { ExternalLink, Search, Users } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { StudentManagerModule } from '../components/StudentManagerModule';
import { Student } from '../types/education';
import { Avatar, btn, Card, Empty, input, PageHeader } from './ui';
import { aulaOf } from '../lib/school';
import { getDemoStudentsForLevels } from '../data/mockData';
import { portalUrl, randomToken, tokenFromQr } from '../lib/store';

export default function StudentsTab({ ctx }: { ctx: PanelCtx }) {
  const { students, store } = ctx;
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  if (store.role !== 'director') return <ReadOnlyList ctx={ctx} />;

  return (
    <>
      <StudentManagerModule
        students={students}
        institutionConfig={ctx.config}
        onAddStudent={(s) => ctx.updateStudents([s, ...students], `Estudiante ${s.fullName} registrado. Su carnet QR ya está listo.`)}
        onImportStudents={(list) => ctx.updateStudents([...list, ...students], `Se importaron ${list.length} estudiantes.`)}
        onDeleteStudent={(id) => setDeleting(students.find((s) => s.id === id) || null)}
        onClearAllStudents={() => ctx.updateStudents([], 'Padrón vaciado.')}
        onLoadDemoStudentsForLevel={store.mode === 'demo' ? () => ctx.updateStudents(getDemoStudentsForLevels(ctx.config.activeLevels), 'Se cargaron estudiantes de ejemplo.') : undefined}
        onSelectStudentForScanTest={ctx.registerStudent}
        onEditStudent={setEditing}
      />

      {editing && (
        <EditStudentModal
          student={editing}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            ctx.updateStudents(students.map((x) => (x.id === s.id ? s : x)), `Datos de ${s.fullName} actualizados.`);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 id="del-title" className="text-lg font-bold text-white">¿Retirar a {deleting.fullName}?</h2>
            <p className="text-sm text-slate-300">Se borrarán también su historial de asistencia y sus notas. Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className={btn.ghost}>Cancelar</button>
              <button type="button" className={btn.danger} onClick={() => {
                ctx.updateStudents(students.filter((s) => s.id !== deleting.id), 'Estudiante retirado.');
                setDeleting(null);
              }}>Sí, retirar</button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function EditStudentModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: (s: Student) => void }) {
  const [s, setS] = useState<Student>(student);
  const set = <K extends keyof Student>(k: K, v: Student[K]) => setS((p) => ({ ...p, [k]: v }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSave({ ...s, fullName: s.fullName.trim() }); };
  const field = (label: string, k: 'fullName' | 'dni' | 'gradeLevel' | 'section' | 'parentName' | 'parentPhone' | 'address' | 'enrollmentCode', type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor={`ed-${k}`}>{label}</label>
      <input id={`ed-${k}`} type={type} value={(s[k] as string) || ''} onChange={(e) => set(k, e.target.value)} className={input} required={k === 'fullName'} />
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <form onSubmit={submit} className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
        <h2 id="edit-title" className="text-lg font-bold text-white">Editar estudiante</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">{field('Nombres y apellidos', 'fullName')}</div>
          {field('DNI', 'dni')}
          {field('Código de matrícula', 'enrollmentCode')}
          {field('Grado', 'gradeLevel')}
          {field('Sección', 'section')}
          {field('Apoderado', 'parentName')}
          {field('Celular del apoderado', 'parentPhone', 'tel')}
          <div className="sm:col-span-2">{field('Dirección', 'address')}</div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="ed-level">Nivel</label>
            <select id="ed-level" value={s.educationalLevel || 'Secundaria'} onChange={(e) => set('educationalLevel', e.target.value as Student['educationalLevel'])} className={input}>
              <option>Inicial</option><option>Primaria</option><option>Secundaria</option>
            </select>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400">¿Perdió su carnet? Genera un QR nuevo: el anterior dejará de funcionar al guardar.</p>
          <button type="button" onClick={() => { set('qrCodeValue', portalUrl(randomToken())); }} className={btn.secondary}>
            {tokenFromQr(s.qrCodeValue) !== tokenFromQr(student.qrCodeValue) ? 'QR nuevo listo ✓' : 'Generar QR nuevo'}
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btn.ghost}>Cancelar</button>
          <button type="submit" className={btn.primary}>Guardar cambios</button>
        </div>
      </form>
    </div>
  );
}

function ReadOnlyList({ ctx }: { ctx: PanelCtx }) {
  const [q, setQ] = useState('');
  const list = ctx.students
    .filter((s) => `${s.fullName} ${s.dni || ''} ${aulaOf(s)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => aulaOf(a).localeCompare(aulaOf(b)) || a.fullName.localeCompare(b.fullName));
  return (
    <div className="space-y-6">
      <PageHeader title="Estudiantes" subtitle={`${ctx.students.length} estudiantes matriculados`} />
      {ctx.students.length === 0 ? (
        <Empty icon={Users} title="Aún no hay estudiantes">La dirección todavía no registró la nómina.</Empty>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-800 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-7 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI o aula" className={`${input} pl-9`} aria-label="Buscar estudiante" />
          </div>
          <ul className="divide-y divide-slate-800">
            {list.slice(0, 400).map((s) => (
              <li key={s.id} className="p-3 sm:px-5 flex items-center gap-3">
                <Avatar src={s.avatarUrl} name={s.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{s.fullName}</p>
                  <p className="text-xs text-slate-400">{aulaOf(s)} · Asistencia {s.totalDays ? `${s.attendanceRate}%` : '—'}</p>
                </div>
                <a href={s.qrCodeValue} target="_blank" rel="noopener noreferrer" className={btn.ghost} aria-label={`Ver portal de ${s.fullName}`}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

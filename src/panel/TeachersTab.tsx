import { useState } from 'react';
import { Copy, Download, FileSpreadsheet, GraduationCap, Mail, MessageCircle, Search, Trash2, UserPlus } from 'lucide-react';
import type { PanelCtx } from './Panel';
import AddTeacherModal from '../components/AddTeacherModal';
import ImportTeachersModal from '../components/ImportTeachersModal';
import { Teacher } from '../types/education';
import { Avatar, btn, Card, Empty, input, PageHeader } from './ui';
import { downloadCsv, waLink } from '../lib/school';

export default function TeachersTab({ ctx }: { ctx: PanelCtx }) {
  const { teachers, codes, config } = ctx;
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [q, setQ] = useState('');

  const list = teachers.filter((t) => `${t.name} ${t.dni || ''} ${t.area} ${t.level} ${t.grades}`.toLowerCase().includes(q.toLowerCase()));

  const exportList = () => downloadCsv('docentes.csv', [
    ['Nombre', 'DNI', 'Correo', 'Celular', 'Área', 'Nivel', 'Grados'],
    ...teachers.map((t) => [t.name, t.dni || '', t.email || '', t.phone || '', t.area, t.level, t.grades]),
  ]);

  const invite = codes?.teacher
    ? `Hola, te invito a usar Ryuk en ${config.shortName || config.institutionName}. Entra a ${window.location.origin}/app, crea tu cuenta y usa el código de docente: ${codes.teacher}`
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docentes"
        subtitle={`${teachers.length} docentes en la nómina`}
        actions={
          <>
            <button type="button" onClick={() => setAdding(true)} className={btn.primary}><UserPlus className="w-4 h-4" /> Nuevo docente</button>
            <button type="button" onClick={() => setImporting(true)} className={btn.secondary}><FileSpreadsheet className="w-4 h-4" /> Importar</button>
            {teachers.length > 0 && <button type="button" onClick={exportList} className={btn.secondary}><Download className="w-4 h-4" /> Exportar</button>}
          </>
        }
      />

      {codes?.teacher && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white">Invita a tus docentes a registrar notas</h2>
            <p className="text-sm text-slate-400 mt-1">Cada docente crea su cuenta en <strong className="text-slate-200">{window.location.host}/app</strong> y usa este código:</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 font-mono text-lg tracking-[0.25em] text-orange-300 inline-flex items-center">{codes.teacher}</span>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(invite); ctx.toast('Invitación copiada. Pégala en WhatsApp o correo.'); }} className={btn.secondary}><Copy className="w-4 h-4" /> Copiar invitación</button>
          </div>
        </Card>
      )}

      {teachers.length === 0 ? (
        <Empty icon={GraduationCap} title="Aún no registras docentes" action={<button type="button" onClick={() => setAdding(true)} className={btn.primary}><UserPlus className="w-4 h-4" /> Registrar el primero</button>}>
          Registra a tu plana docente con su área y grados a cargo, o impórtala en lote desde Excel.
        </Empty>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI o área" className={`${input} pl-9`} aria-label="Buscar docente" />
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((t) => {
              const wa = waLink(t.phone, `Hola ${t.name.split(' ')[0]}, te escribimos de la dirección de ${config.shortName || config.institutionName}.`);
              return (
                <Card key={t.id} className="p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={t.avatarUrl} name={t.name} className="w-12 h-12" />
                    <div className="min-w-0">
                      <p className="font-bold text-white leading-tight">{t.name}</p>
                      <p className="text-sm text-orange-300 truncate">{t.area}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.level} · {t.grades}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-slate-500">DNI</dt><dd className="text-slate-200 font-mono">{t.dni || '—'}</dd></div>
                    <div><dt className="text-slate-500">Celular</dt><dd className="text-slate-200">{t.phone || '—'}</dd></div>
                  </dl>
                  <div className="flex gap-2 mt-auto">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} flex-1`}><MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp</a>}
                    {t.email && <a href={`mailto:${t.email}`} className={btn.secondary} aria-label={`Correo a ${t.name}`}><Mail className="w-4 h-4" /></a>}
                    <button type="button" onClick={() => setDeleting(t)} className={btn.danger} aria-label={`Retirar a ${t.name}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AddTeacherModal institutionConfig={config} isOpen={adding} onClose={() => setAdding(false)} onAddTeacher={(t) => ctx.updateTeachers([t, ...teachers], `Docente ${t.name} registrado.`)} />
      <ImportTeachersModal institutionConfig={config} isOpen={importing} onClose={() => setImporting(false)} onImportTeachers={(l) => ctx.updateTeachers([...l, ...teachers], `Se importaron ${l.length} docentes.`)} />

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-labelledby="del-t">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 id="del-t" className="text-lg font-bold text-white">¿Retirar a {deleting.name}?</h2>
            <p className="text-sm text-slate-300">Sale de la nómina docente. Si tiene cuenta, quítale también el acceso en Configuración → Equipo.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className={btn.ghost}>Cancelar</button>
              <button type="button" className={btn.danger} onClick={() => { ctx.updateTeachers(teachers.filter((x) => x.id !== deleting.id), 'Docente retirado.'); setDeleting(null); }}>Sí, retirar</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

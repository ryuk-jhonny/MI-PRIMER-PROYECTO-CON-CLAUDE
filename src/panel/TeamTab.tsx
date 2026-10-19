import { useEffect, useState } from 'react';
import { Copy, GraduationCap, Pencil, HeartHandshake, RefreshCw, ShieldCheck, Trash2, TriangleAlert, Users } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Codes, ROLE_LABEL, UserProfile } from '../lib/store';
import { friendlyError } from '../lib/firebase';
import { areasOf, LEVEL_LABEL } from '../lib/cneb';
import { btn, Card, Modal, PageHeader } from './ui';
import { LoadForm } from './AreaTab';

export default function TeamTab({ ctx }: { ctx: PanelCtx }) {
  const { store, config } = ctx;
  const [members, setMembers] = useState<UserProfile[] | null>(null);
  const [codes, setCodes] = useState<Codes | null>(null);
  const [removing, setRemoving] = useState<UserProfile | null>(null);
  const [loadOf, setLoadOf] = useState<UserProfile | null>(null);

  const load = async () => {
    try {
      const [m, c] = await Promise.all([store.listMembers(), store.getCodes()]);
      setMembers(m); setCodes(c);
    } catch (err) { ctx.toast(friendlyError(err), 'error'); setMembers([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = async () => {
    try { setCodes(await store.rotateCodes()); ctx.toast('Códigos nuevos generados. Los anteriores ya no sirven para unirse.'); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  const remove = async (m: UserProfile) => {
    setRemoving(null);
    try { await store.removeMember(m.uid); setMembers((l) => l?.filter((x) => x.uid !== m.uid) || null); ctx.toast(`${m.fullName} ya no tiene acceso.`); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  const school = config.shortName || config.institutionName;
  const invite = (role: 'docente' | 'auxiliar', code: string) =>
    `Hola, te invito a ${school} en Ryuk. Entra a ${window.location.origin}/app, crea tu cuenta, elige "Unirme con un código" y escribe: ${code}`;
  const copy = (text: string) => { navigator.clipboard?.writeText(text); ctx.toast('Invitación copiada. Pégala en WhatsApp o en un correo.'); };

  const docentes = (members || []).filter((m) => m.role === 'docente');
  const staff = (members || []).filter((m) => m.role === 'director' || m.role === 'auxiliar');
  const families = (members || []).filter((m) => m.role === 'estudiante' || m.role === 'familia');

  const coverage = config.activeLevels.map((lv) => ({
    lv,
    missing: areasOf(lv).filter((a) => !docentes.some((d) => d.areas?.includes(a) && (!d.levels?.length || d.levels.includes(lv)))),
  }));

  return (
    <div className="space-y-6 stagger">
      <PageHeader title="Equipo docente" subtitle="Cada docente entra con su cuenta y trabaja con las competencias de sus propias áreas. Con «Áreas» puedes asignarle una o varias." />

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Códigos de invitación</h2>
            <p className="text-sm text-slate-400 mt-1">Cada persona crea su cuenta en <strong className="text-slate-200">{window.location.host}/app</strong> y escribe el código de su rol.</p>
          </div>
          <button type="button" onClick={rotate} className={btn.secondary}><RefreshCw className="w-4 h-4" /> Cambiar códigos</button>
        </div>
        {codes ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {([['docente', 'Docentes', 'Planifican, califican por competencia, publican actividades y toman la asistencia de su clase.'], ['auxiliar', 'Personal de puerta', 'Registran los ingresos en la puerta con el escáner QR.']] as const).map(([role, title, desc]) => (
              <div key={role} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-lg tracking-[0.25em] text-orange-300" data-testid={`code-${role}`}>{codes[role]}</span>
                  <button type="button" onClick={() => copy(invite(role, codes[role]))} className={btn.ghost}><Copy className="w-4 h-4" /> Copiar invitación</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Cargando códigos…</p>}
        <p className="text-xs text-slate-500 flex items-start gap-2"><HeartHandshake className="w-4 h-4 text-orange-400 shrink-0" /> Estudiantes y familias usan el código personal de su ficha (Estudiantes → Códigos de acceso).</p>
      </Card>

      {members && docentes.length > 0 && coverage.some((c) => c.missing.length) && (
        <Card className="p-5 border-amber-500/30">
          <h2 className="font-bold text-white flex items-center gap-2"><TriangleAlert className="w-5 h-5 text-amber-400" /> Áreas sin docente</h2>
          <div className="mt-2 space-y-1">
            {coverage.filter((c) => c.missing.length).map((c) => (
              <p key={c.lv} className="text-sm text-slate-300"><strong className="text-white">{LEVEL_LABEL[c.lv]}:</strong> {c.missing.join(', ')}</p>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-slate-800 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-orange-400" /><h2 className="font-bold text-white">Docentes ({docentes.length})</h2></div>
        {members === null ? <p className="p-5 text-sm text-slate-400">Cargando…</p> : docentes.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Aún no se une ningún docente. Comparte el código de docentes.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {docentes.map((m) => (
              <li key={m.uid} className="p-4 sm:px-5 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{m.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email} · {(m.levels || []).map((l) => LEVEL_LABEL[l]).join(' y ') || 'Sin nivel'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(m.areas || []).map((a) => <span key={a} className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-200 text-[11px] font-semibold">{a}</span>)}
                  </div>
                </div>
                <button type="button" onClick={() => setLoadOf(m)} className={btn.ghost} aria-label={`Editar áreas de ${m.fullName}`}><Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Áreas</span></button>
                <button type="button" onClick={() => setRemoving(m)} className={btn.ghost} aria-label={`Quitar acceso a ${m.fullName}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {loadOf && (
        <Modal title={`Carga docente de ${loadOf.fullName}`} onClose={() => setLoadOf(null)} wide>
          <LoadForm ctx={ctx} initial={loadOf} who="docente" onCancel={() => setLoadOf(null)} onSave={async (patch) => {
            try {
              await store.updateTeacherLoad(loadOf.uid, patch);
              setMembers((l) => l?.map((x) => (x.uid === loadOf.uid ? { ...x, ...patch } : x)) || null);
              ctx.toast(`Áreas de ${loadOf.fullName} guardadas.`);
              setLoadOf(null);
            } catch (err) { ctx.toast(friendlyError(err), 'error'); }
          }} />
        </Modal>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="p-4 sm:px-5 border-b border-slate-800 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-orange-400" /><h2 className="font-bold text-white">Dirección y personal</h2></div>
          <ul className="divide-y divide-slate-800">
            {staff.map((m) => (
              <li key={m.uid} className="p-3 sm:px-5 flex items-center gap-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white truncate">{m.fullName}</p><p className="text-xs text-slate-400 truncate">{ROLE_LABEL[m.role]} · {m.email}</p></div>
                {m.role !== 'director' && <button type="button" onClick={() => setRemoving(m)} className={btn.ghost} aria-label={`Quitar acceso a ${m.fullName}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-hidden">
          <div className="p-4 sm:px-5 border-b border-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /><h2 className="font-bold text-white">Estudiantes y familias con cuenta ({families.length})</h2></div>
          {families.length === 0 ? <p className="p-5 text-sm text-slate-400">Todavía nadie usa su código personal.</p> : (
            <ul className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
              {families.map((m) => (
                <li key={m.uid} className="p-3 sm:px-5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{m.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{ROLE_LABEL[m.role]} de {(m.studentIds || []).map((id) => ctx.students.find((s) => s.id === id)?.fullName || 'estudiante retirado').join(', ')}</p>
                  </div>
                  <button type="button" onClick={() => setRemoving(m)} className={btn.ghost} aria-label={`Quitar acceso a ${m.fullName}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {removing && (
        <Modal title={`¿Quitar el acceso a ${removing.fullName}?`} onClose={() => setRemoving(null)}>
          <p className="text-sm text-slate-300">Ya no podrá entrar a {school}. Lo que registró (notas, asistencia, planificación) se conserva.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRemoving(null)} className={btn.ghost}>Cancelar</button>
            <button type="button" onClick={() => remove(removing)} className={btn.danger}>Sí, quitar acceso</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Copy, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import type { PanelCtx } from './Panel';
import InstitutionSettingsModule from '../components/InstitutionSettingsModule';
import { Member } from '../lib/store';
import { friendlyError } from '../lib/supabase';
import { btn, Card } from './ui';

const ROLE = { director: 'Dirección', docente: 'Docente', auxiliar: 'Personal de puerta' };

export default function SettingsTab({ ctx }: { ctx: PanelCtx }) {
  const { store, codes } = ctx;
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    try { setMembers(await store.listMembers()); } catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = async () => {
    try { ctx.setCodes(await store.rotateCodes()); ctx.toast('Códigos nuevos generados. Los anteriores ya no funcionan.'); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  const remove = async (m: Member) => {
    try { await store.removeMember(m.userId); await load(); ctx.toast(`${m.fullName || m.email} ya no tiene acceso.`); }
    catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  const copy = (text: string) => { navigator.clipboard?.writeText(text); ctx.toast('Copiado.'); };

  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /> Equipo y accesos</h2>
            <p className="text-sm text-slate-400 mt-1">Comparte un código para que cada persona cree su cuenta en <strong className="text-slate-200">{window.location.host}/app</strong>.</p>
          </div>
          {store.mode === 'cloud' && <button type="button" onClick={rotate} className={btn.secondary}><RefreshCw className="w-4 h-4" /> Cambiar códigos</button>}
        </div>

        {codes && (
          <div className="grid sm:grid-cols-2 gap-3">
            {([['Docentes', 'Pueden ver estudiantes, registrar asistencia y poner notas.', codes.teacher], ['Personal de puerta', 'Solo registran ingresos con el escáner QR.', codes.staff]] as const).map(([title, desc, code]) => (
              <div key={title} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-lg tracking-[0.25em] text-orange-300">{code}</span>
                  <button type="button" onClick={() => copy(code)} className={btn.ghost} aria-label={`Copiar código de ${title}`}><Copy className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
          {members.map((m) => (
            <li key={m.userId} className="p-3 sm:px-4 flex items-center gap-3 bg-slate-900">
              <ShieldCheck className={`w-5 h-5 shrink-0 ${m.role === 'director' ? 'text-orange-400' : 'text-slate-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{m.fullName || m.email}</p>
                <p className="text-xs text-slate-400 truncate">{ROLE[m.role]} · {m.email}</p>
              </div>
              {m.role !== 'director' && (
                <button type="button" onClick={() => remove(m)} className={btn.ghost} aria-label={`Quitar acceso a ${m.fullName}`}><Trash2 className="w-4 h-4 text-rose-400" /></button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <InstitutionSettingsModule
        config={ctx.config}
        onSaveConfig={ctx.updateConfig}
        onToast={(m) => ctx.toast(m)}
        directorProfile={ctx.profile}
        onUpdateDirectorProfile={ctx.updateProfile}
        teachers={ctx.teachers}
        onUpdateTeacher={(t) => ctx.updateTeachers(ctx.teachers.map((x) => (x.id === t.id ? t : x)), `Ficha de ${t.name} actualizada.`)}
      />
    </div>
  );
}

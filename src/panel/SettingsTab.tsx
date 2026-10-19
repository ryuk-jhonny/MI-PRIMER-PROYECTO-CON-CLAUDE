import { useState } from 'react';
import { Building2, CalendarClock, Clock, Layers, Plus, Save, Trash2, UserRound } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { InstitutionConfig, DirectorProfile } from '../types/institution';
import { Level, LEVEL_LABEL, LEVELS } from '../lib/cneb';
import { periodNames } from '../lib/school';
import { BellConfig, DEFAULT_BELL, generatedSlots, hhmm, mins } from '../lib/schedule';
import { btn, Card, input, label, PageHeader } from './ui';

export default function SettingsTab({ ctx }: { ctx: PanelCtx }) {
  const [cfg, setCfg] = useState<InstitutionConfig>(ctx.config);
  const [prof, setProf] = useState<DirectorProfile>(ctx.profile);
  const [sectionsText, setSectionsText] = useState<Record<string, string>>(() => Object.fromEntries(ctx.config.gradeConfigs.map((g) => [g.gradeId, g.sections.join(', ')])));
  const set = <K extends keyof InstitutionConfig>(k: K, v: InstitutionConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const setP = <K extends keyof DirectorProfile>(k: K, v: DirectorProfile[K]) => setProf((c) => ({ ...c, [k]: v }));
  const dirtyCfg = JSON.stringify(cfg) !== JSON.stringify(ctx.config);
  const dirtyProf = JSON.stringify(prof) !== JSON.stringify(ctx.profile);

  const text = (k: keyof InstitutionConfig, title: string, extra: Record<string, unknown> = {}) => (
    <div><label className={label} htmlFor={`cf-${k}`}>{title}</label><input id={`cf-${k}`} value={(cfg[k] as string) || ''} onChange={(e) => set(k, e.target.value as never)} className={input} {...extra} /></div>
  );

  const setSections = (gradeId: string, raw: string) => {
    setSectionsText((s) => ({ ...s, [gradeId]: raw }));
    const sections = [...new Set(raw.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))].slice(0, 12);
    set('gradeConfigs', cfg.gradeConfigs.map((g) => (g.gradeId === gradeId ? { ...g, sections: sections.length ? sections : ['A'] } : g)));
  };

  const save = async () => {
    if (dirtyCfg) await ctx.updateConfig({ ...cfg, directorName: cfg.directorName || prof.name });
    if (dirtyProf) await ctx.updateProfile(prof);
  };

  const periods = periodNames(cfg);
  const bell = cfg.bell || DEFAULT_BELL;
  const setBell = (patch: Partial<BellConfig>) => set('bell', { ...bell, ...patch });
  // La lista que ve la dirección: la escrita a mano o, si no hay, la armada con los datos de arriba.
  type Row = NonNullable<BellConfig['list']>[number];
  const rows: Row[] = bell.list?.length ? bell.list : generatedSlots(bell).map(({ start, end, recreo }) => (recreo ? { start, end, recreo } : { start, end }));
  const setRows = (list: Row[]) => setBell({ list: [...list].sort((a, b) => a.start.localeCompare(b.start)), count: list.filter((r) => !r.recreo).length });
  const editRow = (i: number, patch: Partial<Row>) => setBell({ list: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addRow = (recreo: boolean) => {
    const last = rows.length ? mins(rows[rows.length - 1].end) : mins(bell.start || '08:00');
    setRows([...rows, { start: hhmm(last), end: hhmm(last + (recreo ? 15 : bell.minutes || 45)), ...(recreo ? { recreo: true } : {}) }]);
  };

  return (
    <div className="space-y-6 stagger">
      <PageHeader title="Configuración" subtitle="Datos oficiales del colegio que aparecen en libretas, carnets y documentos."
        actions={<button type="button" onClick={save} disabled={!dirtyCfg && !dirtyProf} className={btn.primary}><Save className="w-4 h-4" /> Guardar cambios</button>} />

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-orange-400" /> Institución</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">{text('institutionName', 'Nombre oficial', { required: true })}</div>
          {text('shortName', 'Nombre corto')}
          {text('motto', 'Lema')}
          {text('modularCodePrimaria', 'Código modular · Primaria', { inputMode: 'numeric' })}
          {text('modularCodeSecundaria', 'Código modular · Secundaria', { inputMode: 'numeric' })}
          {text('localCode', 'Código de local', { inputMode: 'numeric' })}
          {text('dre', 'DRE')}
          {text('ugel', 'UGEL')}
          {text('directorDni', 'DNI del director(a)', { inputMode: 'numeric' })}
        </div>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-orange-400" /> Año escolar y horario</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {text('academicYear', 'Año escolar', { inputMode: 'numeric' })}
          <div>
            <label className={label} htmlFor="cf-ptype">Periodos</label>
            <select id="cf-ptype" value={cfg.periodType} onChange={(e) => {
              const pt = e.target.value as InstitutionConfig['periodType'];
              setCfg((c) => ({ ...c, periodType: pt, activePeriod: `${pt === 'bimestral' ? 'Bimestre' : 'Trimestre'} I` }));
            }} className={input}>
              <option value="bimestral">4 bimestres</option><option value="trimestral">3 trimestres</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="cf-active">Periodo actual</label>
            <select id="cf-active" value={cfg.activePeriod} onChange={(e) => set('activePeriod', e.target.value)} className={input}>
              {!periods.includes(cfg.activePeriod) && <option>{cfg.activePeriod}</option>}
              {periods.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          {text('doorOpeningTime', 'Apertura de puerta', { type: 'time' })}
          {text('punctualCutoffTime', 'Puntual hasta', { type: 'time' })}
          {text('lateCutoffTime', 'Cierre de ingreso', { type: 'time' })}
          <div>
            <label className={label} htmlFor="cf-shift">Turno</label>
            <select id="cf-shift" value={cfg.shift} onChange={(e) => set('shift', e.target.value as InstitutionConfig['shift'])} className={input}>
              {['Mañana', 'Tarde', 'Completa', 'Doble Turno'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">Quien llega hasta la hora “Puntual hasta” (incluida) queda como puntual; después, como tardanza. Se usa la hora de Lima.</p>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2"><CalendarClock className="w-5 h-5 text-orange-400" /> Bloques de clase</h2>
        <p className="text-sm text-slate-400">Los docentes arman su horario eligiendo estos bloques. Puedes cambiar la hora de cada uno, agregar o borrar bloques y recreos.</p>
        <ol className="space-y-2" aria-label="Bloques de la jornada">
          {rows.map((x, i) => {
            const n = rows.slice(0, i + 1).filter((r) => !r.recreo).length;
            const name = x.recreo ? 'Recreo' : `Bloque ${n}`;
            return (
              <li key={i} className={`grid grid-cols-[6.5rem_1fr_1fr_auto] gap-2 items-center p-2 rounded-xl border ${x.recreo ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <span className={`text-sm font-semibold ${x.recreo ? 'text-sky-200' : 'text-white'}`}>{name}</span>
                <input type="time" value={x.start} onChange={(e) => editRow(i, { start: e.target.value })} className={`${input} h-10`} aria-label={`Inicio de ${name}`} />
                <input type="time" value={x.end} onChange={(e) => editRow(i, { end: e.target.value })} className={`${input} h-10`} aria-label={`Fin de ${name}`} />
                <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.filter((r) => !r.recreo).length <= 1 && !x.recreo}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-300 hover:bg-rose-500/10 cursor-pointer disabled:opacity-30" aria-label={`Borrar ${name}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addRow(false)} disabled={rows.filter((r) => !r.recreo).length >= 14} className={btn.secondary}><Plus className="w-4 h-4" /> Agregar bloque</button>
          <button type="button" onClick={() => addRow(true)} className={btn.ghost}><Plus className="w-4 h-4" /> Agregar recreo</button>
        </div>
        <details className="rounded-xl border border-slate-800 p-3">
          <summary className="text-sm font-semibold text-slate-200 cursor-pointer">Armar todos los bloques de una vez</summary>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div><label className={label} htmlFor="bl-start">Inicio de clases</label><input id="bl-start" type="time" value={bell.start} onChange={(e) => setBell({ start: e.target.value })} className={input} /></div>
            <div><label className={label} htmlFor="bl-min">Minutos por bloque</label><input id="bl-min" type="number" min={10} max={120} value={bell.minutes} onChange={(e) => setBell({ minutes: Number(e.target.value) })} className={input} /></div>
            <div><label className={label} htmlFor="bl-count">Bloques por día</label><input id="bl-count" type="number" min={1} max={14} value={bell.count} onChange={(e) => setBell({ count: Number(e.target.value) })} className={input} /></div>
            <div><label className={label} htmlFor="bl-br">Recreo después del bloque</label>
              <select id="bl-br" value={bell.breaks[0]?.after || 0} onChange={(e) => setBell({ breaks: Number(e.target.value) ? [{ after: Number(e.target.value), minutes: bell.breaks[0]?.minutes || 30 }] : [] })} className={input}>
                <option value={0}>Sin recreo</option>
                {Array.from({ length: Math.max(bell.count - 1, 0) }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}.º</option>)}
              </select>
            </div>
            <div><label className={label} htmlFor="bl-brm">Minutos de recreo</label><input id="bl-brm" type="number" min={5} max={90} value={bell.breaks[0]?.minutes || 30} disabled={!bell.breaks[0]} onChange={(e) => setBell({ breaks: [{ after: bell.breaks[0]?.after || 4, minutes: Number(e.target.value) }] })} className={input} /></div>
          </div>
          <button type="button" onClick={() => setRows(generatedSlots({ ...bell, list: undefined }).map(({ start, end, recreo }) => (recreo ? { start, end, recreo } : { start, end })))} className={`${btn.secondary} mt-3`}>Rehacer los bloques con estos datos</button>
        </details>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2"><Layers className="w-5 h-5 text-orange-400" /> Niveles, grados y secciones</h2>
        <div className="flex gap-2">
          {LEVELS.map((l) => {
            const on = cfg.activeLevels.includes(l);
            return (
              <button key={l} type="button" aria-pressed={on} onClick={() => set('activeLevels', (on ? cfg.activeLevels.filter((x) => x !== l) : [...cfg.activeLevels, l]) as Level[])}
                className={`h-11 px-4 rounded-xl text-sm font-semibold cursor-pointer border ${on ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{LEVEL_LABEL[l]}</button>
            );
          })}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {cfg.gradeConfigs.filter((g) => cfg.activeLevels.includes(g.level)).map((g) => (
            <div key={g.gradeId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <input type="checkbox" checked={g.enabled} onChange={(e) => set('gradeConfigs', cfg.gradeConfigs.map((x) => (x.gradeId === g.gradeId ? { ...x, enabled: e.target.checked } : x)))} className="w-4 h-4 accent-orange-600" aria-label={`Activar ${g.gradeName}`} />
              <span className="text-sm font-semibold text-white w-32 shrink-0">{g.gradeName}</span>
              <input value={sectionsText[g.gradeId] ?? g.sections.join(', ')} onChange={(e) => setSections(g.gradeId, e.target.value)} disabled={!g.enabled} className={`${input} h-10`} aria-label={`Secciones de ${g.gradeName}`} placeholder="A, B, C" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2"><UserRound className="w-5 h-5 text-orange-400" /> Firma de la dirección</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={label} htmlFor="pf-name">Nombre</label><input id="pf-name" value={prof.name} onChange={(e) => setP('name', e.target.value)} className={input} /></div>
          <div><label className={label} htmlFor="pf-title">Cargo en la firma</label><input id="pf-title" value={prof.signatureTitle} onChange={(e) => setP('signatureTitle', e.target.value)} className={input} /></div>
          <div><label className={label} htmlFor="pf-phone">Celular</label><input id="pf-phone" value={prof.phone} onChange={(e) => setP('phone', e.target.value)} className={input} inputMode="tel" /></div>
          <div><label className={label} htmlFor="pf-email">Correo institucional</label><input id="pf-email" type="email" value={prof.email} onChange={(e) => setP('email', e.target.value)} className={input} /></div>
        </div>
      </Card>
    </div>
  );
}

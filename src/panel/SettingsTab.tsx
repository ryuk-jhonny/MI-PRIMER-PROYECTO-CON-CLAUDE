import { useState } from 'react';
import { Building2, Clock, Layers, Save, UserRound } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { InstitutionConfig, DirectorProfile } from '../types/institution';
import { Level, LEVEL_LABEL, LEVELS } from '../lib/cneb';
import { periodNames } from '../lib/school';
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
